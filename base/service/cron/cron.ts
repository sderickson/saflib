import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cronDb } from "@saflib/cron-db";
import { runCron, type CronEnqueuer, type JobsMap } from "@saflib/cron";
import type { DbKey } from "@saflib/drizzle";
import { typedEnv } from "@saflib/env";
import {
  baseServiceStorage,
  type BaseServiceContext,
} from "@saflib/base-service-common/context";
// BEGIN WORKFLOW AREA job-imports FOR cron/add-job
import { __groupName__Jobs } from "./jobs/__group-name__/index.ts";
// END WORKFLOW AREA

export const baseJobs: JobsMap = {
  // BEGIN WORKFLOW AREA job-map FOR cron/add-job
  ...__groupName__Jobs,
  // END WORKFLOW AREA
};

/** Absolute path to the cron job-settings SQLite file under this package's `data/`. */
export function getBaseCronSqlitePath(): string {
  return path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "data",
    `cron-db-${typedEnv.DEPLOYMENT_NAME}.sqlite`,
  );
}

let cronJobSettingsDbKey: DbKey | undefined;

/**
 * Opaque key for `@saflib/cron-db` (not the main app DB key). Use this for
 * `createCronRouter` and `runCron`.
 */
export function getBaseCronDbKey(): DbKey {
  if (!cronJobSettingsDbKey) {
    const sqlitePath = getBaseCronSqlitePath();
    if (process.env.NODE_ENV !== "test") {
      fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
    }
    cronJobSettingsDbKey = cronDb.connect({ onDisk: sqlitePath });
  }
  return cronJobSettingsDbKey;
}

export const runBaseCron = (
  context: BaseServiceContext,
  enqueueJob: CronEnqueuer,
) => {
  return baseServiceStorage.run(context, () =>
    runCron({
      jobs: baseJobs,
      dbKey: getBaseCronDbKey(),
      enqueueJob,
    }),
  );
};
