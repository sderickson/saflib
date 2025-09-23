import { AsyncLocalStorage } from "async_hooks";
import type { DbKey } from "@saflib/drizzle";
import { exampleDb } from "example-db";

export interface ExampleServiceContext {
  exampleDbKey: DbKey;
}

export const exampleServiceStorage =
  new AsyncLocalStorage<ExampleServiceContext>();

export interface ExampleServiceContextOptions {
  exampleDbKey?: DbKey;
}

export const makeContext = (
  options: ExampleServiceContextOptions = {},
): ExampleServiceContext => {
  const dbKey = options.exampleDbKey ?? exampleDb.connect();
  return {
    exampleDbKey: dbKey,
  };
};
