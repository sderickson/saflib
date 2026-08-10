import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cronDb } from "@saflib/cron-db";
import {
  runCron,
  type CronEnqueuer,
  type JobsMap,
} from "@saflib/cron";
import type { DbKey } from "@saflib/drizzle";
import { typedEnv } from "@saflib/env";
import {
  __serviceName__ServiceStorage,
  type __ServiceName__ServiceContext,
} from "template-package-service-common/context";

// TODO: Import job groups and spread into this map (e.g. `...exampleGroupJobs`).
export const __serviceName__Jobs: JobsMap = {};

/** Absolute path to the cron job-settings SQLite file under this package's `data/`. */
export function get__ServiceName__CronSqlitePath(): string {
  return path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "data",
    `cron-db-${typedEnv.DEPLOYMENT_NAME}.sqlite`,
  );
}

let cronJobSettingsDbKey: DbKey | undefined;

/**
 * Opaque key for `@saflib/cron-db` (not the main app DB key). Use this for
 * `createCronRouter({ dbKey: get__ServiceName__CronDbKey(), jobs: __serviceName__Jobs, enqueueJob })` and `runCron`.
 */
export function get__ServiceName__CronDbKey(): DbKey {
  if (!cronJobSettingsDbKey) {
    const sqlitePath = get__ServiceName__CronSqlitePath();
    if (process.env.NODE_ENV !== "test") {
      fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
    }
    cronJobSettingsDbKey = cronDb.connect({ onDisk: sqlitePath });
  }
  return cronJobSettingsDbKey;
}

export const run__ServiceName__Cron = (
  context: __ServiceName__ServiceContext,
  enqueueJob: CronEnqueuer,
) => {
  return __serviceName__ServiceStorage.run(context, () =>
    runCron({
      jobs: __serviceName__Jobs,
      dbKey: get__ServiceName__CronDbKey(),
      enqueueJob,
    }),
  );
};
