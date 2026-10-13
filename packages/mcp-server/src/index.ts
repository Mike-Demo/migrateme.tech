#!/usr/bin/env node
import { createInterface } from "node:readline";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { OllamaProvider } from "@migrateme/ai-mapper";
import {
  CheckpointStore, outputPath, planMigration, validateManifest, validateOutput
} from "@migrateme/core";
import { writeMarkdown } from "@migrateme/markdown";
import { extractWxr, inspectWxr } from "@migrateme/wordpress";

const inputSchemas = {
  inventory_source: z.object({ sourceFile: z.string().min(1) }),
  propose_mapping: z.object({
    sourceField: z.string().min(1),
    candidateFields: z.array(z.string()).min(1),
    sampleValues: z.array(z.string()).max(3)
  }),
  dry_run: z.object({ sourceFile: z.string().min(1), outputRoot: z.string().min(1) }),
  execute_migration: z.object({
    sourceFile: z.string().min(1),
    outputRoot: z.string().min(1),
    approved: z.literal(true)
  }),
  get_job_status: z.object({ jobId: z.string().min(1) }),
  rollback_job: z.object({ jobId: z.string().min(1), approved: z.literal(true) })
};
const outputSchemas = {
  inventory_source: z.object({ counts: z.record(z.string(), z.number()) }),
  propose_mapping: z.object({
    status: z.enum(["proposed", "manual_review"]),
    mapping: z.unknown().nullable()
  }),
  dry_run: z.object({ plan: z.unknown(), risks: z.unknown(), preview: z.array(z.unknown()) }),
  execute_migration: z.object({ jobId: z.string(), itemCount: z.number(), validation: z.unknown() }),
  get_job_status: z.object({ job: z.unknown().nullable() }),
  rollback_job: z.object({ jobId: z.string(), removed: z.number() })
};
type ToolName = keyof typeof inputSchemas;

const tools = [
  { name: "inventory_source", description: "Count WXR content without fetching remote resources.", inputSchema: { type: "object", properties: { sourceFile: { type: "string" } }, required: ["sourceFile"], additionalProperties: false } },
  { name: "propose_mapping", description: "Ask Ollama to propose an ambiguous field mapping; uncertain results require manual review.", inputSchema: { type: "object", properties: { sourceField: { type: "string" }, candidateFields: { type: "array", items: { type: "string" } }, sampleValues: { type: "array", maxItems: 3, items: { type: "string" } } }, required: ["sourceField", "candidateFields", "sampleValues"], additionalProperties: false } },
  { name: "dry_run", description: "Generate a manifest, risk report, and preview without writing migrated files.", inputSchema: { type: "object", properties: { sourceFile: { type: "string" }, outputRoot: { type: "string" } }, required: ["sourceFile", "outputRoot"], additionalProperties: false } },
  { name: "execute_migration", description: "Write Markdown output. Requires explicit approved: true.", inputSchema: { type: "object", properties: { sourceFile: { type: "string" }, outputRoot: { type: "string" }, approved: { const: true } }, required: ["sourceFile", "outputRoot", "approved"], additionalProperties: false } },
  { name: "get_job_status", description: "Read the persisted status of a migration job.", inputSchema: { type: "object", properties: { jobId: { type: "string" } }, required: ["jobId"], additionalProperties: false } },
  { name: "rollback_job", description: "Remove generated Markdown files for a job. Requires explicit approved: true.", inputSchema: { type: "object", properties: { jobId: { type: "string" }, approved: { const: true } }, required: ["jobId", "approved"], additionalProperties: false } }
];
const db = new CheckpointStore(path.resolve(".migrateme/jobs.sqlite"));

async function invoke(name: ToolName, input: unknown): Promise<unknown> {
  let result: unknown;
  switch (name) {
    case "inventory_source": {
      const args = inputSchemas.inventory_source.parse(input);
      result = await inspectWxr(args.sourceFile);
      break;
    }
    case "propose_mapping": {
      const args = inputSchemas.propose_mapping.parse(input);
      const mapping = await new OllamaProvider().proposeMapping(
        args.sourceField, args.candidateFields, args.sampleValues
      );
      result = { status: mapping ? "proposed" : "manual_review", mapping };
      break;
    }
    case "dry_run": {
      const args = inputSchemas.dry_run.parse(input);
      const items = [];
      for await (const item of extractWxr(args.sourceFile)) items.push(item);
      const plan = planMigration(args.sourceFile, items, args.outputRoot);
      result = { plan: plan.manifest, risks: plan.risks, preview: plan.preview };
      break;
    }
    case "execute_migration": {
      const args = inputSchemas.execute_migration.parse(input);
      const items = [];
      for await (const item of extractWxr(args.sourceFile)) items.push(item);
      const plan = planMigration(args.sourceFile, items, args.outputRoot);
      const jobId = crypto.randomUUID();
      await writeMarkdown(extractWxr(args.sourceFile), args.outputRoot);
      const validation = await validateOutput(plan.manifest, args.outputRoot);
      db.save(jobId, { status: validation.passed ? "completed" : "failed", manifest: plan.manifest, outputRoot: args.outputRoot });
      result = { jobId, itemCount: items.length, validation };
      break;
    }
    case "get_job_status": {
      const args = inputSchemas.get_job_status.parse(input);
      result = { job: db.load(args.jobId) ?? null };
      break;
    }
    case "rollback_job": {
      const args = inputSchemas.rollback_job.parse(input);
      const job = db.load<{ manifest?: unknown; outputRoot?: string }>(args.jobId);
      if (!job?.manifest || !job.outputRoot) throw new Error("Job has no rollback data");
      const manifest = validateManifest(job.manifest);
      let removed = 0;
      for (const item of manifest.items) {
        try {
          await unlink(outputPath(job.outputRoot, item));
          removed += 1;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
      }
      db.save(args.jobId, { ...job, status: "rolled-back" });
      result = { jobId: args.jobId, removed };
      break;
    }
  }
  return outputSchemas[name].parse(result);
}

function respond(id: unknown, result: unknown): void {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of lines) {
  try {
    const request = z.object({
      jsonrpc: z.literal("2.0"),
      id: z.union([z.string(), z.number(), z.null()]).optional(),
      method: z.string(),
      params: z.record(z.string(), z.unknown()).optional()
    }).parse(JSON.parse(line));
    if (request.method === "initialize") {
      respond(request.id, { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "migrateme", version: "0.1.0" } });
    } else if (request.method === "tools/list") {
      respond(request.id, { tools });
    } else if (request.method === "tools/call") {
      const params = z.object({ name: z.string(), arguments: z.unknown().optional() }).parse(request.params);
      if (!(params.name in inputSchemas)) throw new Error(`Unknown tool: ${params.name}`);
      const name = params.name as ToolName;
      const content = await invoke(name, params.arguments);
      respond(request.id, { content: [{ type: "text", text: JSON.stringify(content) }], structuredContent: content, isError: false });
    } else {
      respond(request.id, { error: { code: -32601, message: "Method not found" } });
    }
  } catch (error) {
    process.stdout.write(`${JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32602, message: error instanceof Error ? error.message : "Invalid request" }
    })}\n`);
  }
}
db.close();
