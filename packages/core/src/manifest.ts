import { MigrationManifestSchema } from "./manifest.schema.js";

export type FieldMapping = {
  sourceField: string;
  targetField: string;
  method: "deterministic" | "ai" | "manual";
  confidence?: number;
  rationale?: string;
};
export type ContentItem = {
  id: string;
  type: "post" | "page" | "attachment" | "other";
  title: string;
  slug: string;
  date?: string;
  body: string;
  categories: string[];
  tags: string[];
  featuredImage?: string;
  customFields: Record<string, string>;
};
export type Asset = {
  source: string;
  destination?: string;
  checksum?: string;
  status: "pending" | "copied" | "missing" | "skipped";
};
export type TransformationRecord = {
  contentId: string;
  field: string;
  operation: string;
  at: string;
};
export type ProvenanceRecord = {
  source: string;
  importedAt: string;
  sourceId?: string;
};
export type RollbackInfo = {
  enabled: boolean;
  backupDirectory?: string;
};
export type MigrationManifest = {
  version: 1;
  source: { type: "wordpress-wxr"; file: string };
  createdAt: string;
  items: ContentItem[];
  mappings: FieldMapping[];
  assets: Asset[];
  transformations: TransformationRecord[];
  provenance: ProvenanceRecord[];
  rollback: RollbackInfo;
};

export function validateManifest(value: unknown): MigrationManifest {
  return MigrationManifestSchema.parse(value) as MigrationManifest;
}
