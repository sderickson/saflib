type OneOf<T, K extends keyof T = keyof T> = K extends keyof T
  ? Pick<T, K> & Partial<Record<Exclude<keyof T, K>, never>>
  : never;

/**
 * An object with either a `result` or an `error`.
 * Async functions which are exported by packages, such as database queries and integration calls,
 * should use this for their return types. This way errors are typed and can be handled
 * with type safety.
 *
 * Users of ReturnError should use it like this:
 *
 * ```typescript
 * // Make any errors available as a package export so consumers
 * // can check for them in a switch statement.
 * export class ExpectedError extends Error {};
 *
 * export const unsafeOperation = async (): Promise<ReturnsError<string, ExpectedError>> => {
 *   // ... some code ...
 *   if (conditionFails) {
 *     return { error: new ExpectedError("Condition failed") };
 *   }
 *   return { result: "success" };
 * }
 * ```
 *
 * Consumers of functions that ReturnError should handle the errors like this:
 *
 * ```typescript
 * const { result, error } = await unsafeOperation();
 * if (error) {
 *   switch (true) {
 *     case error instanceof ErrorClass:
 *       return res.status(errorCode);
 *     default:
 *       throw error satisfies never;
 *   }
 * }
 * ```
 */
export type ReturnsError<T, E extends Error = Error> = OneOf<{
  error: E;
  result: T;
}>;

type NonUndefined<T> = T extends undefined ? never : T;

/**
 * If a Promise which uses ReturnsError is unlikely to error,
 * use this function to throw a chained error and return the result.
 * **Use this function responsibly.**
 * By using it you declare "I bet this won't happen".
 *
 * It will not throw the original error. Instead it will create a new
 * one with the caught error as the `cause`. You may provide your own
 * Error class.
 */
export const throwError = async <T>(
  promise: Promise<ReturnsError<T>>,
  ErrorClass: new (message: string, options?: any) => Error = Error,
): Promise<NonUndefined<T>> => {
  const { result, error } = await promise;
  if (error) {
    throw new ErrorClass("Unexpected error", { cause: error });
  }
  return result as NonUndefined<T>; // not sure why TS thinks result might be undefined
};

// Hack so TS doesn't complain about dirname and filename
declare global {
  interface ImportMeta {
    dirname: string;
    filename: string;
  }
}

/**
 * For Prometheus metrics.
 */
export const metricHistogramDefaultBuckets = [0.003, 0.03, 0.1, 0.3, 1.5, 10];
