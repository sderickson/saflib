import { type JobsMap } from "@saflib/cron-http";
import { backupJobs as backupGroupJobs } from "./jobs/backup/index.ts";

export const backupJobs: JobsMap = {
  ...backupGroupJobs,
};
