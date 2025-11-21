import { runCron, type JobsMap } from "@saflib/cron";
import {
  backupServiceStorage,
  type BackupServiceContext,
} from "@saflib/backup-service-common";

// TODO: Import and add jobs here
export const backupJobs: JobsMap = {
  // Add more jobs as needed
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
