import { AsyncLocalStorage } from "async_hooks";
import type { DbKey } from "@saflib/drizzle";
import { __serviceName__Db } from "template-package-db";

export interface __ServiceName__ServiceContext {
  __serviceName__DbKey: DbKey;
}

export const __serviceName__ServiceStorage =
  new AsyncLocalStorage<__ServiceName__ServiceContext>();

export interface __ServiceName__ServiceContextOptions {
  __serviceName__DbKey?: DbKey;
}

export const makeContext = (
  options: __ServiceName__ServiceContextOptions = {},
): __ServiceName__ServiceContext => {
  const dbKey = options.__serviceName__DbKey ?? __serviceName__Db.connect();
  return {
    __serviceName__DbKey: dbKey,
  };
};
