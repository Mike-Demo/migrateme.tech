import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { WordPressConnector } from "../packages/connectors/wordpress/dist/index.js";
import { CheckpointStore } from "../packages/core/dist/index.js";
import { createMcpServer } from "../packages/mcp-server/dist/index.js";

const requireMcpPackage = createRequire(new URL("../packages/mcp-server/package.json", import.meta.url));
const { Client } = requireMcpPackage("@modelcontextprotocol/sdk/client/index.js");
const { InMemoryTransport } = requireMcpPackage("@modelcontextprotocol/sdk/inMemory.js");
const { StdioClientTransport } = requireMcpPackage("@modelcontextprotocol/sdk/client/stdio.js");
const fixture = fileURLToPath(new URL("./fixtures/wordpress-wxr.xml", import.meta.url));
const serverEntry = fileURLToPath(new URL("../packages/mcp-server/dist/index.js", import.meta.url));

test("MCP tools expose validated schemas and execute through the shared engine", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "mcp-server-"));
  const output = path.join(parent, "content");
  const store = new CheckpointStore(path.join(parent, "jobs.sqlite"));
  let writes = 0;
  let rollbacks = 0;
  const server = createMcpServer({
    source: new WordPressConnector(),
    destination: {
      async load() { writes += 1; },
      async rollback() { rollbacks += 1; }
    },
    store
  });
  const client = new Client({ name: "mcp-test", version: "0.1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  try {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map(({ name }) => name).sort(), [
      "dry_run",
      "execute_migration",
      "get_job_status",
      "inventory_source",
      "propose_mapping",
      "rollback_job"
    ]);
    for (const tool of tools) {
      assert.ok(tool.inputSchema);
      assert.ok(tool.outputSchema);
    }

    const inventory = await client.callTool({
      name: "inventory_source",
      arguments: { sourcePath: fixture }
    });
    assert.equal(inventory.structuredContent.counts.posts, 1);
    assert.ok(inventory.structuredContent.fields.includes("title"));
    assert.ok(inventory.structuredContent.fields.includes("_thumbnail_id"));

    const proposed = await client.callTool({
      name: "propose_mapping",
      arguments: { sourcePath: fixture, outputPath: output }
    });
    const manifest = proposed.structuredContent.manifest;
    assert.equal(manifest.items.length, 3);

    const dryRun = await client.callTool({
      name: "dry_run",
      arguments: { sourcePath: fixture, outputPath: output }
    });
    assert.equal(dryRun.structuredContent.preview.length, 3);
    assert.equal(writes, 0);

    const missingApproval = await client.callTool({
      name: "execute_migration",
      arguments: { manifest, jobId: "missing-approval" }
    });
    assert.equal(missingApproval.isError, true);
    assert.equal(store.load("missing-approval"), undefined);

    const denied = await client.callTool({
      name: "execute_migration",
      arguments: { manifest, jobId: "job-1", approved: false }
    });
    assert.equal(denied.isError, true);
    assert.equal(writes, 0);
    assert.equal(store.load("job-1"), undefined);

    const executed = await client.callTool({
      name: "execute_migration",
      arguments: { manifest, jobId: "job-1", approved: true }
    });
    assert.equal(executed.structuredContent.state.status, "completed");
    assert.ok(writes > 0);

    const status = await client.callTool({
      name: "get_job_status",
      arguments: { jobId: "job-1" }
    });
    assert.equal(status.structuredContent.state.status, "completed");

    const rollback = await client.callTool({
      name: "rollback_job",
      arguments: { jobId: "job-1" }
    });
    assert.deepEqual(rollback.structuredContent, { jobId: "job-1", rolledBack: true });
    assert.equal(rollbacks, 1);
  } finally {
    await client.close();
    await server.close();
    store.close();
  }
});

test("MCP stdio subprocess initializes, lists tools, and refuses unapproved execution", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "mcp-stdio-"));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
    cwd: parent,
    env: { ...process.env, MIGRATEME_JOB_DB: path.join(parent, "jobs.sqlite") }
  });
  const client = new Client({ name: "mcp-stdio-test", version: "0.1.0" });

  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    assert.ok(tools.some(({ name }) => name === "execute_migration"));

    const proposed = await client.callTool({
      name: "propose_mapping",
      arguments: { sourcePath: fixture, outputPath: path.join(parent, "content") }
    });
    const refused = await client.callTool({
      name: "execute_migration",
      arguments: {
        manifest: proposed.structuredContent.manifest,
        jobId: "stdio-unapproved",
        approved: false
      }
    });
    assert.equal(refused.isError, true);
    assert.match(refused.content[0].text, /requires explicit approval/);

    const status = await client.callTool({
      name: "get_job_status",
      arguments: { jobId: "stdio-unapproved" }
    });
    assert.equal(status.structuredContent.state, null);
  } finally {
    await client.close();
  }
});
