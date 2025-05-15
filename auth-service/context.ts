import { AsyncLocalStorage } from "async_hooks";
import type { DbKey } from "@saflib/drizzle-sqlite3";
export const authServiceStorage = new AsyncLocalStorage<{
  dbKey: DbKey;
}>();
