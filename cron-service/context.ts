import { AsyncLocalStorage } from "async_hooks";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import type { JobsMap } from "./src/types.ts";

export const cronServiceStorage = new AsyncLocalStorage<{
  dbKey: DbKey;
  jobs: JobsMap;
}>();
