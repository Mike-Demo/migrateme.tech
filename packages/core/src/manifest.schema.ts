import { z } from "zod";

export const FieldMappingSchema = z.object({
  sourceField: z.string().min(1),
  targetField: z.string().min(1).optional(),
  method: z.enum(["deterministic", "ai", "manual"]),
  confidence: z.number().min(0).max(1).optional(),
  rationale: z.string().optional()
});

export const ContentItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["post", "page", "attachment", "other"]),
  title: z.string(),
  slug: z.string(),
  date: z.string().optional(),
  body: z.string(),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  featuredImage: z.string().optional(),
  customFields: z.record(z.string(), z.string()).default({})
});

export const AssetSchema = z.object({
  source: z.string(),
  destination: z.string().optional(),
  checksum: z.string().optional(),
  status: z.enum(["pending", "copied", "missing", "skipped"]).default("pending")
});

export const TransformationRecordSchema = z.object({
  contentId: z.string(),
  field: z.string(),
  operation: z.string(),
  at: z.string().datetime()
});

export const ProvenanceRecordSchema = z.object({
  source: z.string(),
  importedAt: z.string().datetime(),
  sourceId: z.string().optional()
});

export const RollbackInfoSchema = z.object({
  enabled: z.boolean().default(false),
  backupDirectory: z.string().optional()
});

export const MigrationManifestSchema = z.object({
  version: z.literal(1),
  source: z.object({ type: z.literal("wordpress-wxr"), file: z.string() }),
  createdAt: z.string().datetime(),
  items: z.array(ContentItemSchema),
  mappings: z.array(FieldMappingSchema),
  assets: z.array(AssetSchema).default([]),
  transformations: z.array(TransformationRecordSchema).default([]),
  provenance: z.array(ProvenanceRecordSchema).default([]),
  rollback: RollbackInfoSchema.default({ enabled: false })
});
