import { CronJob } from "cron";
import {
  createLogger,
  defaultErrorReporter,
  generateRequestId,
  getSafReporters,
  safContextStorage,
  safReportersStorage,
  makeSubsystemReporters,
  type SafContext,
  type SafReporters,
  getServiceName,
} from "@saflib/node";
import { jobSettingsDb } from "@saflib/cron-db";
import type { CronEnqueuer, JobConfig, JobsMap } from "./types.ts";
import type { DbKey } from "@saflib/drizzle";
import { JobSettingNotFoundError } from "@saflib/cron-db";
import { cronMetric, type CronLabels } from "./metrics.ts";

async function executeJobWithHandling(
  jobName: string,
  jobConfig: JobConfig,
  dbKey: DbKey,
  enabledBy: string,
  enqueueJob: CronEnqueuer,
) {
  const reqId = generateRequestId();
  const context: SafContext = {
    requestId: reqId,
    serviceName: getServiceName(),
    subsystemName: "cron",
    operationName: jobName,
  };
  const reporters: SafReporters = {
    log: createLogger(context),
    logError: defaultErrorReporter,
  };

  await safContextStorage.run(context, async () => {
    await safReportersStorage.run(reporters, async () => {
      const { logError } = getSafReporters();
      let statusToSet: "success" | "fail" = "fail";

      const labels: CronLabels = {
        service_name: getServiceName(),
        job_name: jobName,
        status: "running",
      };
      const timer = cronMetric.startTimer(labels);
      try {
        await enqueueJob({
          jobName,
          enabledBy,
          operationId: jobConfig.enqueue.operationId,
          request: jobConfig.enqueue.request,
          dedupeKey: jobConfig.enqueue.dedupeKey ?? `cron:${jobName}`,
          priority: jobConfig.enqueue.priority,
          requestId: reqId,
        });

        statusToSet = "success";
        labels.status = "success";
      } catch (error) {
        logError(error);
        statusToSet = "fail";
        labels.status = "error";
      } finally {
        timer();
        try {
          await jobSettingsDb.setLastRunStatus(dbKey, jobName, statusToSet);
        } catch (dbError) {
          logError(
            new Error(
              `CRITICAL: Failed to set final job status to '${statusToSet}' for ${jobName}. DB Error: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
            ),
          );
        }
      }
    });
  });
}

// --- Main Job Scheduling Logic ---
interface StartJobConfig {
  dbKey: DbKey;
  enqueueJob: CronEnqueuer;
}

export const startJobs = async (
  jobsToStart: JobsMap,
  config: StartJobConfig,
) => {
  const { log, logError } = makeSubsystemReporters("cron", "startJobs");
  const { dbKey, enqueueJob } = config;
  const jobs: CronJob[] = [];
  for (const [jobName, jobConfig] of Object.entries(jobsToStart)) {
    const { error } = await jobSettingsDb.getByName(dbKey, jobName);
    if (error) {
      if (error instanceof JobSettingNotFoundError) {
        log.warn(
          `Job setting for '${jobName}' not found in DB. Creating default (disabled).`,
        );
        await jobSettingsDb.setEnabled(dbKey, jobName, false);
      } else {
        log.error(
          `Failed to retrieve initial job setting for '${jobName}'. Skipping job.`,
        );
        continue;
      }
    }

    jobs.push(
      CronJob.from({
        cronTime: jobConfig.schedule,
        onTick: async () => {
          try {
            const { result: currentJobSetting, error } =
              await jobSettingsDb.getByName(dbKey, jobName);
            if (error) {
              logError(error);
              return;
            }
            if (!currentJobSetting.enabled) {
              return;
            }
            if (!currentJobSetting.enabledBy) {
              log.warn(
                `Cron job '${jobName}' is enabled but enabled_by is null; skipping tick until an admin re-enables to record authority.`,
              );
              return;
            }

            await executeJobWithHandling(
              jobName,
              jobConfig,
              dbKey,
              currentJobSetting.enabledBy,
              enqueueJob,
            );
          } catch (error) {
            logError(error);
          }
        },
        start: true,
      }),
    );
  }
  return jobs;
};
