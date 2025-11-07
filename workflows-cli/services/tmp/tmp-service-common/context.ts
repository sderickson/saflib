import { AsyncLocalStorage } from "async_hooks";
import type { DbKey } from "@saflib/drizzle";
import { tmpDb } from "tmp-db";

export interface TmpServiceContext {
  tmpDbKey: DbKey;
}

export const tmpServiceStorage =
  new AsyncLocalStorage<TmpServiceContext>();

export interface TmpServiceContextOptions {
  tmpDbKey?: DbKey;
}

export const makeContext = (
  options: TmpServiceContextOptions = {},
): TmpServiceContext => {
  const dbKey = options.tmpDbKey ?? tmpDb.connect();
  return {
    tmpDbKey: dbKey,
  };
};
