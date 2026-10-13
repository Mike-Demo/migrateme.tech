#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CheckpointStore, createJobState, markCompleted, planMigration, validateManifest, validateOutput
} from "@migrateme/core";
import { writeMarkdown } from "@migrateme/markdown";
import { extractWxr, inspectWxr } from "@migrateme/wordpress";

function flags(args: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    if (key === "approve") result[key] = true;
    else {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
      result[key] = value;
      index += 1;
    }
  }
  return result;
}

async function readItems(source: string) {
  const items = [];
  for await (const item of extractWxr(source)) items.push(item);
  return items;
}

function required(options: Record<string, string | boolean>, key: string): string {
  const value = options[key];
  if (typeof value !== "string" || !value) throw new Error(`--${key} is required`);
  return value;
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  const options = flags(args);
  const source = typeof options.source === "string" ? options.source : "";
  const output = typeof options.output === "string" ? options.output : path.resolve("migrated");
  const db = new CheckpointStore(path.resolve(".migrateme/jobs.sqlite"));
  try {
    if (command === "inventory") {
      console.log(JSON.stringify(await inspectWxr(required(options, "source")), null, 2));
    } else if (command === "plan" || command === "dry-run") {
      const filename = required(options, "source");
      const plan = planMigration(filename, await readItems(filename), output);
      if (command === "plan" && typeof options.manifest === "string") {
        await writeFile(options.manifest, JSON.stringify(plan.manifest, null, 2), { flag: "wx" });
      }
      console.log(JSON.stringify({
        manifest: plan.manifest,
        risks: plan.risks,
        preview: plan.preview
      }, null, 2));
    } else if (command === "migrate") {
      if (options.approve !== true) throw new Error("Migration refused: pass --approve to execute.");
      const filename = required(options, "source");
      const items = await readItems(filename);
      const plan = planMigration(filename, items, output);
      const id = typeof options.job === "string" ? options.job : crypto.randomUUID();
      let state = createJobState(id, db);
      state = {
        ...state,
        status: "running",
        manifest: plan.manifest,
        outputRoot: output,
        sourceFile: filename
      };
      db.save(id, state);
      await writeMarkdown(extractWxr(filename), output, {
        skipIds: new Set(state.completedItemIds),
        onItemWritten: (itemId) => { state = markCompleted(state, itemId, db); }
      });
      db.save(id, { ...state, status: "completed" });
      console.log(JSON.stringify({ jobId: id, output, itemCount: items.length }));
    } else if (command === "validate") {
      const manifestPath = required(options, "manifest");
      const manifest = validateManifest(JSON.parse(await readFile(manifestPath, "utf8")));
      console.log(JSON.stringify(await validateOutput(manifest, output), null, 2));
    } else if (command === "job") {
      const id = required(options, "id");
      console.log(JSON.stringify(db.load(id) ?? { id, status: "not-found" }, null, 2));
    } else {
      throw new Error("Usage: migrateme <inventory|plan|dry-run|migrate|validate|job> [options]");
    }
  } finally {
    db.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Migration failed");
  process.exitCode = 1;
});
