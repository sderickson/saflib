import { HandledDatabaseError } from "@saflib/drizzle";

/**
 * Superclass for all handled dev-site db errors
 */
export class DevSiteDatabaseError extends HandledDatabaseError {}

export class AnalyzedCommitNotFoundError extends DevSiteDatabaseError {}
