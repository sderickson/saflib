import { HandledDatabaseError } from "@saflib/drizzle";

/**
 * Superclass for all handled audit-db errors
 */
export class AuditDatabaseError extends HandledDatabaseError {}

/** Malformed or unparsable keyset cursor for `listAuditEventsByTimestamp`. */
export class InvalidAuditEventCursorError extends AuditDatabaseError {}

/** Range contains more than one `schema_version` without `expectedGenesis` (verify opt-in). */
export class MixedAuditSchemaVersionError extends AuditDatabaseError {}
