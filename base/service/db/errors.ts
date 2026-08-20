import { HandledDatabaseError } from "@saflib/drizzle";

/**
 * Superclass for all handled base db errors
 */
export class BaseDatabaseError extends HandledDatabaseError {}

// TODO: Add specific error classes for your database
export class StubError extends BaseDatabaseError {}
