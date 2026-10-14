import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CheckpointStore,
  executeMigration,
  planMigration,
  type ContentItem,
  type MigrationConnector
} from "@migrateme/core";
import type { z } from "zod";
import {
  DryRunInputSchema,
  DryRunOutputSchema,
  ExecuteMigrationInputSchema,
  ExecuteMigrationOutputSchema,
  GetJobStatusInputSchema,
  GetJobStatusOutputSchema,
  InventorySourceInputSchema,
  InventorySourceOutputSchema,
  ProposeMappingInputSchema,
  ProposeMappingOutputSchema,
  RollbackJobInputSchema,
  RollbackJobOutputSchema
} from "./schemas.js";

export type McpServerDependencies = {
  source: Pick<MigrationConnector, "detect" | "inspect" | "extract">;
  destination: Pick<MigrationConnector, "load" | "rollback">;
  store: CheckpointStore;
};

async function collectItems(
  source: McpServerDependencies["source"],
  sourcePath: string
): Promise<ContentItem[]> {
  if (!await source.detect(sourcePath)) {
    throw new Error(`Unsupported source file: ${sourcePath}`);
  }
  const items: ContentItem[] = [];
  for await (const item of source.extract(sourcePath)) items.push(item);
  return items;
}

function result<TSchema extends z.ZodType>(
  schema: TSchema,
  value: unknown
): {
  structuredContent: z.output<TSchema>;
  content: [{ type: "text"; text: string }];
} {
  const parsed = schema.parse(value);
  return {
    structuredContent: parsed,
    content: [{ type: "text", text: JSON.stringify(parsed) }]
  };
}

export function createMcpServer(dependencies: McpServerDependencies): McpServer {
  const server = new McpServer({ name: "migrateme", version: "0.1.0" });

  server.registerTool("inventory_source", {
    description: "Inspect a WordPress WXR source and list its content counts and fields.",
    inputSchema: InventorySourceInputSchema,
    outputSchema: InventorySourceOutputSchema
  }, async ({ sourcePath }) => {
    const items = await collectItems(dependencies.source, sourcePath);
    const counts = (await dependencies.source.inspect(sourcePath)).counts;
    const fields = new Set<string>();
    for (const item of items) {
      for (const field of Object.keys(item)) {
        if (field !== "customFields") fields.add(field);
      }
      for (const field of Object.keys(item.customFields)) fields.add(field);
    }
    return result(InventorySourceOutputSchema, {
      sourcePath,
      counts,
      fields: [...fields].sort()
    });
  });

  server.registerTool("propose_mapping", {
    description: "Build a migration manifest with deterministic field mappings.",
    inputSchema: ProposeMappingInputSchema,
    outputSchema: ProposeMappingOutputSchema
  }, async ({ sourcePath, outputPath }) => {
    const items = await collectItems(dependencies.source, sourcePath);
    const { manifest } = planMigration(sourcePath, items, outputPath);
    return result(ProposeMappingOutputSchema, { manifest });
  });

  server.registerTool("dry_run", {
    description: "Preview migration output and risks without writing destination files.",
    inputSchema: DryRunInputSchema,
    outputSchema: DryRunOutputSchema
  }, async ({ sourcePath, outputPath }) => {
    const items = await collectItems(dependencies.source, sourcePath);
    const plan = planMigration(sourcePath, items, outputPath);
    return result(DryRunOutputSchema, plan);
  });

  server.registerTool("execute_migration", {
    description: "Execute a migration only after explicit approval is provided.",
    inputSchema: ExecuteMigrationInputSchema,
    outputSchema: ExecuteMigrationOutputSchema
  }, async ({ manifest, jobId, approved }) => {
    if (approved !== true) {
      throw new Error("Migration execution requires explicit approval");
    }
    const execution = await executeMigration(manifest, {
      approved,
      jobId,
      store: dependencies.store,
      connector: dependencies.destination
    });
    return result(ExecuteMigrationOutputSchema, execution);
  });

  server.registerTool("get_job_status", {
    description: "Return the saved checkpoint state for a migration job.",
    inputSchema: GetJobStatusInputSchema,
    outputSchema: GetJobStatusOutputSchema
  }, async ({ jobId }) => result(GetJobStatusOutputSchema, {
    jobId,
    state: dependencies.store.load(jobId) ?? null
  }));

  server.registerTool("rollback_job", {
    description: "Ask the destination connector to roll back a migration job.",
    inputSchema: RollbackJobInputSchema,
    outputSchema: RollbackJobOutputSchema
  }, async ({ jobId }) => {
    if (!dependencies.store.load(jobId)) throw new Error(`Unknown migration job: ${jobId}`);
    await dependencies.destination.rollback(jobId);
    return result(RollbackJobOutputSchema, { jobId, rolledBack: true });
  });

  return server;
}
