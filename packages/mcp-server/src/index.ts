import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CheckpointStore } from "@migrateme/core";
import { MarkdownConnector } from "@migrateme/connector-markdown";
import { WordPressConnector } from "@migrateme/connector-wordpress";
import { createMcpServer } from "./server.js";

export * from "./schemas.js";
export * from "./server.js";

export async function startMcpServer(): Promise<void> {
  const databasePath = path.resolve(process.env.MIGRATEME_JOB_DB ?? ".migrateme/jobs.sqlite");
  await mkdir(path.dirname(databasePath), { recursive: true });
  const store = new CheckpointStore(databasePath);
  const server = createMcpServer({
    source: new WordPressConnector(),
    destination: new MarkdownConnector(),
    store
  });
  await server.connect(new StdioServerTransport());
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await startMcpServer();
}
