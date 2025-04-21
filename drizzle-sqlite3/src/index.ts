export type OneOf<T, K extends keyof T = keyof T> = K extends keyof T
  ? Pick<T, K> & Partial<Record<Exclude<keyof T, K>, never>>
  : never;

export {
  queryWrapper,
  UnhandledDatabaseError,
  HandledDatabaseError,
} from "./errors.ts";
