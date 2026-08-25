import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jobsDb } from "@saflib/jobs-db";
import {
  runJobs,
  validateCronTriggerKeys,
  type JobOperationConfigMap,
  type TriggerMap,
} from "@saflib/jobs";
import type { DbKey } from "@saflib/drizzle";
import { typedEnv } from "@saflib/env";
import { jsonSpec } from "@saflib/base-spec";
import {
  baseServiceStorage,
  type BaseServiceContext,
} from "@saflib/base-service-common/context";
import { baseJobs } from "@saflib/base-cron";

/**
 * Reviewed map of which base operations may enqueue which operations.
 * Validated against the bundled OpenAPI spec at startup.
 */
export const baseTriggerMap: TriggerMap = {
  startJobsDemo: ["jobsDemoStepB"],
  jobsDemoStepB: ["jobsDemoStepC"],
  // HTTP/API callers → background targets (jobs/add-job).
  // BEGIN WORKFLOW AREA trigger-map FOR jobs/add-job
  // END WORKFLOW AREA
  "cron:jobsDemoKick": ["jobsDemoStepB"],
  // Cron job names → background targets (cron/add-job). Template stub uses the
  // demo step so the golden product validates; replace operationId when adding.
  // BEGIN WORKFLOW AREA cron-trigger-map FOR cron/add-job
  "cron:__targetName__": ["jobsDemoStepB"],
  // END WORKFLOW AREA
};

/** Per-target overrides (≤ 120s ceiling). */
export const baseJobOperations: JobOperationConfigMap = {
  jobsDemoStepB: { timeoutMs: 30_000, maxAttempts: 5 },
  jobsDemoStepC: { timeoutMs: 30_000 },
};

/** Absolute path to the jobs SQLite file under this package's `data/`. */
export function getBaseJobsSqlitePath(): string {
  return path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "data",
    `jobs-db-${typedEnv.DEPLOYMENT_NAME}.sqlite`,
  );
}

let jobsDbKey: DbKey | undefined;

/** Opaque key for `@saflib/jobs-db` (separate from the main app DB). */
export function getBaseJobsDbKey(): DbKey {
  if (!jobsDbKey) {
    const sqlitePath = getBaseJobsSqlitePath();
    if (process.env.NODE_ENV !== "test") {
      fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
    }
    jobsDbKey = jobsDb.connect({ onDisk: sqlitePath });
  }
  return jobsDbKey;
}

/**
 * Validates `baseTriggerMap` / `baseJobOperations` against the base OpenAPI spec
 * and `cron:` trigger keys against registered `baseJobs`, then starts the jobs runtime.
 */
export const runBaseJobs = (context: BaseServiceContext) => {
  return baseServiceStorage.run(context, async () => {
    validateCronTriggerKeys(baseTriggerMap, Object.keys(baseJobs));

    return runJobs({
      triggerMap: baseTriggerMap,
      operationConfig: baseJobOperations,
      apiSpec: jsonSpec,
      targetSocketPath:
        (
          typedEnv as {
            BASE_SERVICE_INTERNAL_SOCKET?: string;
          }
        ).BASE_SERVICE_INTERNAL_SOCKET ?? "/tmp/base-internal.sock",
      dbKey: getBaseJobsDbKey(),
    });
  });
};
