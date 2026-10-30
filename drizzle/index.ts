export {
  queryWrapper,
  UnhandledDatabaseError,
  HandledDatabaseError,
} from "./errors.ts";

export { DbManager } from "./instances.ts";
export {
  checkMigrationHistory,
  MigrationHistoryError,
  readSquashManifest,
  SQUASH_MANIFEST_PATH,
  type SquashManifest,
  type SquashRecord,
} from "./migration-history.ts";
export {
  createOnDiskDbKeyAccessor,
  packageSqlitePath,
  type CreateOnDiskDbKeyAccessorOptions,
} from "./on-disk-db-key.ts";
export * from "./types.ts";
export type { Address } from "./types/address.ts";
export { addressSchema } from "./types/address.ts";
export {
  fileMetadataColumns,
  type FileMetadataFields,
} from "./types/file-metadata.ts";
export { generateShortId } from "./id.ts";
export {
  assertNoFkCascades,
  findFkCascadeViolations,
  type FkCascadeViolation,
} from "./no-fk-cascades.ts";
