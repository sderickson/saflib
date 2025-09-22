import { HandledDatabaseError } from "@saflib/drizzle";

/**
 * Superclass for all handled __service-name__ db errors
 */
export class __ServiceName__DatabaseError extends HandledDatabaseError {}

// TODO: Add specific error classes for your database
export class ExampleError extends __ServiceName__DatabaseError {}
