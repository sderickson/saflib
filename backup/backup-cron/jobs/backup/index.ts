import type { JobsMap } from "@saflib/cron";

/**
 * Declarative cron → enqueue map. Target operations are implemented by the
 * backup HTTP service when it wires `runCron` with `makeCronEnqueuer`.
 */
export const backupJobs: JobsMap = {
  automatic: {
    schedule: "0 0 * * *",
    enqueue: { operationId: "runAutomaticBackup" },
  },
  cleanup: {
    schedule: "0 1 * * *",
    enqueue: { operationId: "runBackupCleanup" },
  },
};
