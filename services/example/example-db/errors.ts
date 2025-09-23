import { HandledDatabaseError } from "@saflib/drizzle";

/**
 * Superclass for all handled example db errors
 */
export class ExampleDatabaseError extends HandledDatabaseError {}

// TODO: Add specific error classes for your database
export class StubError extends ExampleDatabaseError {}
