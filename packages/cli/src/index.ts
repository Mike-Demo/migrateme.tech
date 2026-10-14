import { pathToFileURL } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CheckpointStore, executeMigration, planMigration, validateManifest, validateOutput } from "@migrateme/core";
import type { ContentItem } from "@migrateme/core";
import { MarkdownConnector } from "@migrateme/connector-markdown";
import { WordPressConnector } from "@migrateme/connector-wordpress";

type Options = Record<string, string | boolean>;

const usage = `Usage:
  migrateme plan --input <wxr.xml> --output <directory> [--manifest <file>]
  migrateme dry-run --input <wxr.xml> --output <directory> [--manifest <file>]
  migrateme migrate --manifest <file> --approve [--job-id <id>] [--state-db <file>]
  migrateme validate --manifest <file> [--output <directory>]
  migrateme job --job-id <id> [--state-db <file>]`;

function parseOptions(args: string[]): Options {
  const options: Options = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument?.startsWith("--")) throw new Error(`Unexpected argument: ${argument}`);
    const name = argument.slice(2);
    if (!name || name in options) throw new Error(`Invalid or repeated option: ${argument}`);
    if (name === "approve") {
      options[name] = true;
      continue;
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Option --${name} requires a value`);
    options[name] = value;
    index += 1;
  }
  return options;
}

function requireValue(options: Options, name: string): string {
  const value = options[name];
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing required option --${name}`);
  return value;
}

function optionalValue(options: Options, name: string, fallback: string): string {
  const value = options[name];
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !value.trim()) throw new Error(`Option --${name} requires a value`);
  return value;
}

async function loadManifest(filename: string) {
  const value: unknown = JSON.parse(await readFile(filename, "utf8"));
  return validateManifest(value);
}

async function createPlan(input: string, output: string) {
  const source = new WordPressConnector();
  const items: ContentItem[] = [];
  for await (const item of source.extract(input)) items.push(source.map(item));
  return planMigration(input, items, output);
}

async function saveManifest(filename: string | undefined, manifest: unknown): Promise<void> {
  if (filename) await writeFile(filename, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function openStore(filename: string): Promise<CheckpointStore> {
  await mkdir(path.dirname(path.resolve(filename)), { recursive: true });
  return new CheckpointStore(filename);
}

async function run(command: string, options: Options): Promise<unknown> {
  switch (command) {
    case "plan":
    case "dry-run": {
      const input = requireValue(options, "input");
      const output = requireValue(options, "output");
      const result = await createPlan(input, output);
      await saveManifest(typeof options.manifest === "string" ? options.manifest : undefined, result.manifest);
      return {
        command,
        manifest: result.manifest,
        preview: result.preview,
        risks: result.risks,
        summary: result.summary
      };
    }
    case "migrate": {
      if (options.approve !== true) {
        throw new Error("Migration requires explicit approval. Re-run with --approve to write destination files.");
      }
      const filename = requireValue(options, "manifest");
      const manifest = await loadManifest(filename);
      const store = await openStore(optionalValue(options, "state-db", ".migrateme/jobs.sqlite"));
      try {
        const result = await executeMigration(manifest, {
          approved: options.approve === true,
          jobId: optionalValue(options, "job-id", "default"),
          store,
          connector: new MarkdownConnector()
        });
        await saveManifest(filename, result.manifest);
        return { command, manifest: result.manifest, state: result.state };
      } finally {
        store.close();
      }
    }
    case "validate": {
      const filename = requireValue(options, "manifest");
      const manifest = await loadManifest(filename);
      const output = optionalValue(options, "output", manifest.destination.outputPath);
      const report = await validateOutput(manifest, output);
      if (!report.passed) process.exitCode = 1;
      return { command, report };
    }
    case "job": {
      const jobId = requireValue(options, "job-id");
      const store = await openStore(optionalValue(options, "state-db", ".migrateme/jobs.sqlite"));
      try {
        const state = store.load(jobId);
        if (!state) throw new Error(`Job not found: ${jobId}`);
        return { command, state };
      } finally {
        store.close();
      }
    }
    case "help":
    case "--help":
    case "-h":
      return { usage };
    default:
      throw new Error(`Unknown command: ${command}\n${usage}`);
  }
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const [command, ...commandArgs] = args;
  if (!command) throw new Error(usage);
  const result = await run(command, parseOptions(commandArgs));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`migrateme: ${message}\n`);
    process.exitCode = 1;
  });
}
