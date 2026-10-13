import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const fixture = path.join(root, "fixtures/wordpress/basic.xml");

function run(program, args, cwd, input = "") {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [program, ...args], { cwd, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (value) => { stdout += value; });
    child.stderr.setEncoding("utf8").on("data", (value) => { stderr += value; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(input);
  });
}

test("CLI refuses to migrate without explicit approval", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "migrateme-cli-"));
  try {
    const result = await run(path.join(root, "packages/cli/dist/index.js"),
      ["migrate", "--source", fixture, "--output", path.join(cwd, "out")], cwd);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /pass --approve/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("MCP exposes tools and fails closed when migration approval is omitted", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "migrateme-mcp-"));
  try {
    const input = [
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: {
        name: "execute_migration", arguments: { sourceFile: fixture, outputRoot: path.join(cwd, "out") }
      } })
    ].join("\n");
    const result = await run(path.join(root, "packages/mcp-server/dist/index.js"), [], cwd, input);
    const lines = result.stdout.trim().split("\n").map((line) => JSON.parse(line));
    assert.equal(lines[0].result.tools.length, 6);
    assert.match(lines[1].error.message, /approved/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
