import { getSafReporters } from "@saflib/node";

/**
 * A subclass of `Error` which is used to indicate that an error was *not* caught
 * and handled by the database library. The cause of the error is not propagated,
 * since consumers of the database libary should not have access to underlying
 * SQL issues.
 *
 * When there is an UnhandledDatabaseError, the database library should be updated
 * to handle it. Any occurence should be considered a bug.
 */
export class UnhandledDatabaseError extends Error {
  constructor() {
    super("A database library did not catch and handle an error. Check logs.");
    this.name = "UnhandledDatabaseError";
  }
}

/**
 * A subclass of `Error` which is used to indicate that an error was caught and
 * handled by the database library. Database packages should subclass this error,
 * and these are not necessarily considered bugs if they occur.
 */
export class HandledDatabaseError extends Error {}

/**
 * All queries should use this wrapper. It will catch and obfuscate unhandled
 * errors, and rethrow handled errors, though really handled errors should be
 * returned, not thrown.
 */
export function queryWrapper<F extends (...args: any[]) => Promise<any>>(
  queryFunc: F,
): F {
  return (async (...args: any[]) => {
    try {
      return await queryFunc(...args);
    } catch (error) {
      if (error instanceof HandledDatabaseError) {
        throw error;
      }
      const { logError } = getSafReporters();
      logError(error);
      if (process.env.NODE_ENV === "test") {
        console.log("UnhandledDatabaseError", error);
      }
      throw new UnhandledDatabaseError();
    }
  }) as F;
}
