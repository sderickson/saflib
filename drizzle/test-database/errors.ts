import { HandledDatabaseError } from "@saflib/drizzle";

/**
 * Superclass for all handled test-database db errors
 */
export class TestDatabaseDatabaseError extends HandledDatabaseError {}

// Specific error classes for the test-database
export class UserNotFoundError extends TestDatabaseDatabaseError {}
export class UserEmailAlreadyExistsError extends TestDatabaseDatabaseError {}
export class InvalidUserDataError extends TestDatabaseDatabaseError {}
