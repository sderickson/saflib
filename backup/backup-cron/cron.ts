import { runCron, type JobsMap } from "@saflib/cron";
import {
  backupServiceStorage,
  type BackupServiceContext,
} from "@saflib/backup-service-common";
import { backupJobs as backupGroupJobs } from "./jobs/backup/index.ts";

export const backupJobs: JobsMap = {
  ...backupGroupJobs,
};

export const runBackupCron = (
  context: BackupServiceContext,
) => {
  return backupServiceStorage.run(context, () =>
    runCron({
      jobs: backupJobs,
      dbKey: context.backupDbKey,
    }),
  );
};
