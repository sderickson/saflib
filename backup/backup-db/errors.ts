import { HandledDatabaseError } from "@saflib/drizzle";

/**
 * Superclass for all handled backup db errors
 */
export class BackupDatabaseError extends HandledDatabaseError {}

// TODO: Add specific error classes for your database
export class StubError extends BackupDatabaseError {}
