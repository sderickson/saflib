import { AsyncLocalStorage } from "async_hooks";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import type { AuthServiceCallbacks } from "./types.ts";

export const authServiceStorage = new AsyncLocalStorage<{
  callbacks: AuthServiceCallbacks;
  dbKey: DbKey;
}>();
