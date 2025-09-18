import { HandledDatabaseError } from "@saflib/drizzle";

/**
 * Superclass for all handled secrets db errors
 */
export class SecretsDatabaseError extends HandledDatabaseError {}

// TODO: Add specific error classes for your database
export class SecretsNotFoundError extends SecretsDatabaseError {}
