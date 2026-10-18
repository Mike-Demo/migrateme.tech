import type { MigrationManifest } from "./manifest.js";

/**
 * Manifest v2 — the generalisation designed for MigrateMe Universal
 * (build kit §2) and folded in with it on 2026-10-18.
 *
 * v1 (see manifest.ts) locks the source to the literal "wordpress-wxr"
 * and the destination to the literal "markdown". v2 generalises both to
 * open string ids so any registered source/destination pair can be
 * described, while keeping every other manifest section identical.
 * A v1 manifest remains valid input: `upgradeManifestV1ToV2` converts it
 * losslessly, and nothing ever downgrades a v2 manifest silently.
 */
export interface ManifestV2 {
  version: 2;
  source: { type: string; file?: string; url?: string; format?: string };
  destination: { connector: string; outputPath: string; variant?: string };
  createdAt: string;
  items: MigrationManifest["items"];
  mappings: MigrationManifest["mappings"];
  assets: MigrationManifest["assets"];
  transformations: MigrationManifest["transformations"];
  provenance: MigrationManifest["provenance"];
  rollback: MigrationManifest["rollback"];
}

export function upgradeManifestV1ToV2(manifest: MigrationManifest): ManifestV2 {
  return {
    version: 2,
    source: { type: manifest.source.type, file: manifest.source.file },
    destination: {
      connector: manifest.destination.connector,
      outputPath: manifest.destination.outputPath
    },
    createdAt: manifest.createdAt,
    items: manifest.items,
    mappings: manifest.mappings,
    assets: manifest.assets,
    transformations: manifest.transformations,
    provenance: manifest.provenance,
    rollback: manifest.rollback
  };
}

export function isManifestV2(value: unknown): value is ManifestV2 {
  if (!value || typeof value !== "object") return false;
  const m = value as Record<string, unknown>;
  const source = m.source as Record<string, unknown> | undefined;
  const destination = m.destination as Record<string, unknown> | undefined;
  return (
    m.version === 2 &&
    !!source &&
    typeof source.type === "string" &&
    !!destination &&
    typeof destination.connector === "string" &&
    typeof destination.outputPath === "string" &&
    typeof m.createdAt === "string" &&
    Array.isArray(m.items) &&
    Array.isArray(m.mappings) &&
    Array.isArray(m.assets) &&
    Array.isArray(m.transformations) &&
    Array.isArray(m.provenance) &&
    !!m.rollback &&
    typeof m.rollback === "object"
  );
}
