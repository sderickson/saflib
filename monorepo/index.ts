type OneOf<T, K extends keyof T = keyof T> = K extends keyof T
  ? Pick<T, K> & Partial<Record<Exclude<keyof T, K>, never>>
  : never;

export type ReturnsError<T, E extends Error = Error> = OneOf<{
  error: E;
  result: T;
}>;

type NonUndefined<T> = T extends undefined ? never : T;

export const throwError = async <T>(
  promise: Promise<ReturnsError<T>>,
  ErrorClass: new (message: string, options?: ErrorOptions) => Error = Error,
): Promise<NonUndefined<T>> => {
  /*
  If a Promise which returns { result, error } is unlikely to error,
  use this function to throw an error in that unlikely event. It will
  handle chaining and such.

  Use this function responsibly.
  */
  const { result, error } = await promise;
  if (error) {
    throw new ErrorClass("Failed to update call log", { cause: error });
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
