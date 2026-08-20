import { HandledDatabaseError } from "@saflib/drizzle";

/**
 * Superclass for all handled templates db errors
 */
export class TemplatesDatabaseError extends HandledDatabaseError {}

// TODO: Add specific error classes for your database
export class StubError extends TemplatesDatabaseError {}
