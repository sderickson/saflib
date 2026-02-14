import { HandledDatabaseError } from "@saflib/drizzle";

/**
 * Superclass for all handled tmp db errors
 */
export class TmpDatabaseError extends HandledDatabaseError {}

// TODO: Add specific error classes for your database
export class StubError extends TmpDatabaseError {}
