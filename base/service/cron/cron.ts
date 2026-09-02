import { cronDb } from "@saflib/cron-db";
import { runCron, type CronEnqueuer, type JobsMap } from "@saflib/cron";
import { createOnDiskDbKeyAccessor } from "@saflib/drizzle";
import {
  baseServiceStorage,
  type BaseServiceContext,
} from "@saflib/base-service-common/context";
import { jobsDemoJobs } from "./jobs/jobs-demo/index.ts";
// BEGIN WORKFLOW AREA job-imports FOR cron/add-job
import { __groupName__Jobs } from "./jobs/__group-name__/index.ts";
// END WORKFLOW AREA

export const baseJobs: JobsMap = {
  ...jobsDemoJobs,
  // BEGIN WORKFLOW AREA job-map FOR cron/add-job
  ...__groupName__Jobs,
  // END WORKFLOW AREA
};

const cronDbAccessor = createOnDiskDbKeyAccessor({
  packageUrl: import.meta.url,
  filePrefix: "cron-db",
  connect: cronDb.connect,
});

/**
 * Opaque key for `@saflib/cron-db` (not the main app DB key). Use this for
 * `createCronRouter` and `runCron`.
 */
export const getBaseCronDbKey = cronDbAccessor.getDbKey;

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
