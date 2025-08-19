import type { DbTransaction } from "@saflib/drizzle-sqlite3";
import * as schema from "./schema.ts";

type Schema = typeof schema;

import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

// General Types
export type CronDbType = BetterSQLite3Database<Schema>;
export type CronDbTransaction = DbTransaction<Schema>;

// --- Job Settings --- //
export type { JobSetting } from "./schema.ts";

export type LastRunStatus = "success" | "fail" | "running" | "timed out";
