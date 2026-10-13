import { z } from "zod";
import type {
  Asset,
  ContentChecksum,
  ContentItem,
  FieldMapping,
  MigrationManifest,
  ProvenanceRecord,
  RollbackInfo,
  Taxonomy,
  TransformationRecord
} from "./manifest.js";

export const FieldMappingSchema: z.ZodType<FieldMapping> = z.object({
  sourceField: z.string().min(1),
  targetField: z.string().min(1),
  method: z.enum(["deterministic", "ai", "manual"]),
  confidence: z.number().min(0).max(1).optional(),
  rationale: z.string().optional()
}).strict();

export const TaxonomySchema: z.ZodType<Taxonomy> = z.object({
  name: z.string().min(1),
  terms: z.array(z.string())
}).strict();

export const ContentChecksumSchema: z.ZodType<ContentChecksum> = z.object({
  algorithm: z.literal("sha256"),
  sourceValue: z.string().min(1),
  destinationValue: z.string().min(1).optional()
}).strict();

export const ContentItemSchema: z.ZodType<ContentItem> = z.object({
  id: z.string().min(1),
  type: z.enum(["post", "page", "attachment", "other"]),
  title: z.string(),
  slug: z.string(),
  date: z.string().optional(),
  body: z.string(),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  taxonomies: z.array(TaxonomySchema).optional(),
  author: z.string().optional(),
  links: z.array(z.string()).optional(),
  featuredImage: z.string().optional(),
  customFields: z.record(z.string(), z.string()).default({}),
  destinationId: z.string().optional(),
  checksum: ContentChecksumSchema.optional(),
  status: z.enum([
    "planned",
    "dry_run_previewed",
    "migrated",
    "validated",
    "failed",
    "rolled_back"
  ]).default("planned")
}).strict();

export const AssetSchema: z.ZodType<Asset> = z.object({
  source: z.string(),
  destination: z.string().optional(),
  checksum: z.string().optional(),
  status: z.enum(["pending", "copied", "missing", "skipped"]).default("pending")
}).strict();

export const TransformationRecordSchema: z.ZodType<TransformationRecord> = z.object({
  contentId: z.string(),
  field: z.string(),
  operation: z.string(),
  at: z.string().datetime()
}).strict();

export const ProvenanceRecordSchema: z.ZodType<ProvenanceRecord> = z.object({
  source: z.string(),
  importedAt: z.string().datetime(),
  sourceId: z.string().optional()
}).strict();

export const RollbackInfoSchema: z.ZodType<RollbackInfo> = z.object({
  enabled: z.boolean().default(false),
  backupDirectory: z.string().optional()
}).strict();

export const MigrationManifestSchema: z.ZodType<MigrationManifest> = z.object({
  version: z.literal(1),
  source: z.object({ type: z.literal("wordpress-wxr"), file: z.string() }).strict(),
  destination: z.object({
    connector: z.literal("markdown"),
    outputPath: z.string().min(1)
  }).strict(),
  createdAt: z.string().datetime(),
  items: z.array(ContentItemSchema),
  mappings: z.array(FieldMappingSchema),
  assets: z.array(AssetSchema).default([]),
  transformations: z.array(TransformationRecordSchema).default([]),
  provenance: z.array(ProvenanceRecordSchema).default([]),
  rollback: RollbackInfoSchema.default({ enabled: false })
}).strict();
