/**
 * Open Migration Package (OMP) validator surface.
 *
 * The implementation lives in the Universal connectors package
 * (`packages/connectors/universal/src/omp/omp.ts`), which is the OMP
 * reference implementation folded in from MigrateMe Universal. This
 * package re-exports it so the standard has one stable import home:
 * `@migrateme/format`.
 */
export {
  OMP_FORMAT,
  OMP_VERSION,
  OMP_MANIFEST_FILE,
  OMP_CONTENT_DIR,
  OMP_ASSETS_DIR,
  validateOmpManifest,
  verifyChecksums,
  ompItemToCanonical,
  blocksToMarkdown,
  markdownToBlocks,
} from "@migrateme/connector-universal";
export type {
  OmpManifest,
  OmpItem,
  OmpAsset,
  OmpTaxonomy,
  OmpBlock,
  OmpValidationResult,
  ChecksumReport,
} from "@migrateme/connector-universal";
