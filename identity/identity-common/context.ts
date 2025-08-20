import { AsyncLocalStorage } from "async_hooks";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import type { IdentityServiceCallbacks } from "./types.ts";

export const authServiceStorage = new AsyncLocalStorage<{
  callbacks: IdentityServiceCallbacks;
  dbKey: DbKey;
}>();
