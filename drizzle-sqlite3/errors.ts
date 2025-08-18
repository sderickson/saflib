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

export function queryWrapper<T, A extends any[]>(
  queryFunc: (...args: A) => Promise<T>,
): (...args: A) => Promise<T> {
  return async (...args: A) => {
    try {
      return await queryFunc(...args);
    } catch (error) {
      if (error instanceof HandledDatabaseError) {
        // In this case, the calling code should handle and report the error if needed.
        throw error;
      }
      // In this case, something unhandled happened. Report it, then throw an error
      // without any details, lest the calling code tries to handle it.
      const { logError } = getSafReporters();
      logError(error);
      if (process.env.NODE_ENV === "test") {
        console.log("UnhandledDatabaseError", error);
      }
      throw new UnhandledDatabaseError();
    }
  };
}
