import { HandledDatabaseError } from "@saflib/drizzle";

/**
 * Superclass for all handled secrets db errors
 */
export class SecretsDatabaseError extends HandledDatabaseError {}

// Specific error classes for secrets operations
export class SecretsNotFoundError extends SecretsDatabaseError {}
export class SecretAlreadyExistsError extends SecretsDatabaseError {}
export class InvalidSecretDataError extends SecretsDatabaseError {}
export class SecretAccessDeniedError extends SecretsDatabaseError {}
