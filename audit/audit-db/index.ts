export { auditDb } from "./instances.ts";
export {
  auditWriteLockPath,
  withAuditWriteLock,
} from "./audit-write-lock.ts";
export {
  auditDbDataRoot,
  defaultAuditDbSqlitePath,
} from "./paths.ts";
export { canonicalizeAuditRow } from "./canonicalize.ts";
export { computeRowHash, GENESIS_HASH } from "./hash-chain.ts";
export type { AuditEventDetails, AuditEventEntity } from "./schemas/audit-event.ts";

// BEGIN WORKFLOW AREA query-exports FOR drizzle/add-query
export { appendAuditEvent } from "./queries/audit-event/append.ts";
export { clearAuditEventsForTests } from "./queries/audit-event/clear-for-tests.ts";
export { getAuditEventTimestampBounds } from "./queries/audit-event/timestamp-bounds.ts";
export { InvalidAuditEventCursorError, MixedAuditSchemaVersionError } from "./errors.ts";
export { listAuditEventsByTimestamp } from "./queries/audit-event/list-by-timestamp.ts";
export { verifyAuditChain } from "./queries/audit-event/verify-chain.ts";
export type { AppendAuditEventError, AppendAuditEventParams } from "./queries/audit-event/append.ts";
export type {
  AuditEventTimestampBounds,
  GetAuditEventTimestampBoundsError,
} from "./queries/audit-event/timestamp-bounds.ts";
export type {
  ListAuditEventsByTimestampError,
  ListAuditEventsByTimestampParams,
  ListAuditEventsByTimestampResult,
} from "./queries/audit-event/list-by-timestamp.ts";
export type {
  VerifyAuditChainError,
  VerifyAuditChainFailure,
  VerifyAuditChainFailureReason,
  VerifyAuditChainParams,
  VerifyAuditChainResult,
  VerifyAuditChainSuccess,
} from "./queries/audit-event/verify-chain.ts";
// END WORKFLOW AREA
