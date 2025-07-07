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
import { cronDb } from "@saflib/cron-db";

import type { JobConfig, JobsMap } from "./types.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { JobSettingNotFoundError } from "@saflib/cron-db";

// --- Helper Function for Job Execution and Error Handling ---

async function executeJobWithHandling(
  subsystemName: string,
  jobName: string,
  jobConfig: JobConfig,
  dbKey: DbKey,
) {
  const reqId = generateRequestId();
  const context: SafContext = {
    requestId: reqId,
    serviceName: getServiceName(),
    subsystemName,
    operationName: jobName,
  };
  const reporters: SafReporters = {
    log: createLogger(context),
    logError: defaultErrorReporter,
  };

  await safContextStorage.run(context, async () => {
    await safReportersStorage.run(reporters, async () => {
      const jobTimeoutSeconds = jobConfig.timeoutSeconds ?? 10;
      const timeoutMs = jobTimeoutSeconds * 1000;
      const { logError } = getSafReporters();
      let statusToSet: "success" | "fail" | "timed out" = "fail"; // Default to fail

      try {
        // Set status to running *before* starting the handler/timeout race
        await cronDb.jobSettings.setLastRunStatus(dbKey, jobName, "running");

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `Job ${jobName} timed out after ${jobTimeoutSeconds} seconds`,
                ),
              ),
            timeoutMs,
          ),
        );

        // Race the handler against the timeout
        await Promise.race([jobConfig.handler(reqId), timeoutPromise]);

        // If race succeeds without error
        statusToSet = "success";
      } catch (error) {
        logError(error);
        const isErrorInstance = error instanceof Error;
        const errorMessage = isErrorInstance
          ? (error as Error).message
          : String(error);

        if (errorMessage.includes("timed out")) {
          logError(new Error(errorMessage));
          statusToSet = "timed out";
        } else {
          statusToSet = "fail";
        }
      } finally {
        try {
          await cronDb.jobSettings.setLastRunStatus(
            dbKey,
            jobName,
            statusToSet,
          );
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
  subsystemName: string;
  dbKey: DbKey;
}

export const startJobs = async (
  jobsToStart: JobsMap,
  config: StartJobConfig,
) => {
  const { log, logError } = makeSubsystemReporters(
    config.subsystemName,
    "startJobs",
  );
  const { dbKey } = config;
  for (const [jobName, jobConfig] of Object.entries(jobsToStart)) {
    const { error } = await cronDb.jobSettings.getByName(dbKey, jobName);
    if (error) {
      if (error instanceof JobSettingNotFoundError) {
        log.warn(
          `Job setting for '${jobName}' not found in DB. Creating default (disabled).`,
        );
        await cronDb.jobSettings.setEnabled(dbKey, jobName, false);
      } else {
        log.error(
          `Failed to retrieve initial job setting for '${jobName}'. Skipping job.`,
        );
        continue;
      }
    }

    CronJob.from({
      cronTime: jobConfig.schedule,
      onTick: async () => {
        // Use schedulerLogger for logs before entering job-specific context
        try {
          const { result: currentJobSetting, error } =
            await cronDb.jobSettings.getByName(dbKey, jobName);
          if (error) {
            logError(error);
            return;
          }
          if (!currentJobSetting.enabled) {
            return;
          }

          await executeJobWithHandling(
            config.subsystemName,
            jobName,
            jobConfig,
            dbKey,
          );

          // TODO: Remove this
          logError(new Error("Test error"), {
            level: "warning",
            extra: {
              status: "success",
            },
          });
        } catch (error) {
          logError(error);
        }
      },
      start: true,
    });
  }
};
