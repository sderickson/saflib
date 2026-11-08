import { HandledDatabaseError } from "@saflib/drizzle";

/**
 * Superclass for all handled ops db errors.
 */
export class OpsDatabaseError extends HandledDatabaseError {}

/** No token with that id. */
export class OpsTokenNotFoundError extends OpsDatabaseError {}

/** The token exists but was already revoked. */
export class OpsTokenAlreadyRevokedError extends OpsDatabaseError {}
