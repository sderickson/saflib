import { HandledDatabaseError } from "@saflib/drizzle";

/**
 * Superclass for all handled dev-site db errors
 */
export class DevSiteDatabaseError extends HandledDatabaseError {}

// TODO: Add specific error classes for your database
export class StubError extends DevSiteDatabaseError {}
