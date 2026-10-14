import { z } from "zod";
import { MigrationManifestSchema } from "@migrateme/core";

export const JobStateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["planned", "running", "completed", "failed"]),
  completedItemIds: z.array(z.string()),
  completedItems: z.record(z.string(), z.object({
    checksum: z.object({
      algorithm: z.literal("sha256"),
      sourceValue: z.string().min(1),
      destinationValue: z.string().min(1).optional()
    }).strict(),
    slug: z.string(),
    destinationId: z.string().optional()
  }).strict()),
  failedItems: z.record(z.string(), z.object({
    checksum: z.object({
      algorithm: z.literal("sha256"),
      sourceValue: z.string().min(1),
      destinationValue: z.string().min(1).optional()
    }).strict()
  }).strict())
}).strict();

export const InventorySourceInputSchema = z.object({
  sourcePath: z.string().min(1)
}).strict();

export const InventorySourceOutputSchema = z.object({
  sourcePath: z.string().min(1),
  counts: z.record(z.string(), z.number().int().nonnegative()),
  fields: z.array(z.string())
}).strict();

export const ProposeMappingInputSchema = z.object({
  sourcePath: z.string().min(1),
  outputPath: z.string().min(1)
}).strict();

export const ProposeMappingOutputSchema = z.object({
  manifest: MigrationManifestSchema
}).strict();

export const DryRunInputSchema = ProposeMappingInputSchema;

export const DryRunOutputSchema = z.object({
  manifest: MigrationManifestSchema,
  preview: z.array(z.object({
    path: z.string().min(1),
    content: z.string()
  }).strict()),
  risks: z.object({
    unresolvedMappings: z.array(z.string()),
    unsupportedFields: z.array(z.string()),
    missingAssets: z.array(z.string()),
    validationConcerns: z.array(z.string())
  }).strict(),
  summary: z.object({
    itemCount: z.number().int().nonnegative(),
    previewCount: z.number().int().nonnegative(),
    riskCount: z.number().int().nonnegative()
  }).strict()
}).strict();

export const ExecuteMigrationInputSchema = z.object({
  manifest: MigrationManifestSchema,
  jobId: z.string().min(1),
  approved: z.boolean()
}).strict();

export const ExecuteMigrationOutputSchema = z.object({
  manifest: MigrationManifestSchema,
  state: JobStateSchema
}).strict();

export const GetJobStatusInputSchema = z.object({
  jobId: z.string().min(1)
}).strict();

export const GetJobStatusOutputSchema = z.object({
  jobId: z.string().min(1),
  state: JobStateSchema.nullable()
}).strict();

export const RollbackJobInputSchema = GetJobStatusInputSchema;

export const RollbackJobOutputSchema = z.object({
  jobId: z.string().min(1),
  rolledBack: z.literal(true)
}).strict();

export { MigrationManifestSchema };
