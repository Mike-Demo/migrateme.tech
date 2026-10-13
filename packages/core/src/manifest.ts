import { MigrationManifestSchema } from "./manifest.schema.js";

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  method: "deterministic" | "ai" | "manual";
  confidence?: number;
  rationale?: string;
}

export interface Taxonomy {
  name: string;
  terms: string[];
}

export interface ContentChecksum {
  algorithm: "sha256";
  sourceValue: string;
  destinationValue?: string;
}

export interface ContentItem {
  id: string;
  type: "post" | "page" | "attachment" | "other";
  title: string;
  slug: string;
  date?: string;
  body: string;
  categories: string[];
  tags: string[];
  taxonomies?: Taxonomy[];
  author?: string;
  links?: string[];
  featuredImage?: string;
  customFields: Record<string, string>;
  destinationId?: string;
  checksum?: ContentChecksum;
  status: "planned" | "dry_run_previewed" | "migrated" | "validated" | "failed" | "rolled_back";
}

export interface Asset {
  source: string;
  destination?: string;
  checksum?: string;
  status: "pending" | "copied" | "missing" | "skipped";
}

export interface TransformationRecord {
  contentId: string;
  field: string;
  operation: string;
  at: string;
}

export interface ProvenanceRecord {
  source: string;
  importedAt: string;
  sourceId?: string;
}

export interface RollbackInfo {
  enabled: boolean;
  backupDirectory?: string;
}

export interface MigrationManifest {
  version: 1;
  source: { type: "wordpress-wxr"; file: string };
  destination: { connector: "markdown"; outputPath: string };
  createdAt: string;
  items: ContentItem[];
  mappings: FieldMapping[];
  assets: Asset[];
  transformations: TransformationRecord[];
  provenance: ProvenanceRecord[];
  rollback: RollbackInfo;
}

export function validateManifest(value: unknown): MigrationManifest {
  return MigrationManifestSchema.parse(value);
}
