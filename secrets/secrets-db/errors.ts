import { HandledDatabaseError } from "@saflib/drizzle";

/**
 * Superclass for all handled secrets db errors
 */
export class SecretDatabaseError extends HandledDatabaseError {}

// Specific error classes for secrets operations
export class SecretNotFoundError extends SecretDatabaseError {}
export class SecretAlreadyExistsError extends SecretDatabaseError {}
export class InvalidSecretDataError extends SecretDatabaseError {}
export class SecretAccessDeniedError extends SecretDatabaseError {}

// Specific error classes for service-tokens operations
export class ServiceTokenNotFoundError extends SecretDatabaseError {}
export class ServiceTokenAlreadyExistsError extends SecretDatabaseError {}
export class InvalidServiceTokenDataError extends SecretDatabaseError {}
