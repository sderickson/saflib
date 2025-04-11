// To dissuade services from catching unhandled errors and papering over them programmatically, we log the error details and throw an error with a generic message. If a service catches this error, it should be solved (and/or possibly thrown as a new Error type) in the database library, not the service layer.

/**
 * Interface for structured error metadata
 */
export interface ErrorMetadata {
  [key: string]: unknown;
}

export class UnhandledDatabaseError extends Error {
  constructor() {
    super("A database library did not catch and handle an error. Check logs.");
    this.name = "UnhandledDatabaseError";
  }
}

export class HandledDatabaseError extends Error {
  /**
   * Optional metadata for additional context
   */
  metadata?: ErrorMetadata;

  /**
   * Creates a new HandledDatabaseError
   *
   * @param message Human-readable error message
   * @param metadata Additional context for debugging (should not contain sensitive data)
   */
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message);
    this.name = this.constructor.name;

    // Store non-sensitive metadata if provided
    if (metadata) {
      this.metadata = metadata;
    }
  }
}

export function queryWrapper<T, A extends any[]>(
  queryFunc: (...args: A) => Promise<T>,
): (...args: A) => Promise<T> {
  return async (...args: A) => {
    try {
      return await queryFunc(...args);
    } catch (error) {
      if (error instanceof HandledDatabaseError) {
        throw error;
      }
      console.error(error);
      throw new UnhandledDatabaseError();
    }
  };
}
