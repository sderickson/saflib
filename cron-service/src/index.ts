import { CronJob } from "cron";
import {
  createLogger,
  createServiceLogger,
  defaultErrorReporter,
  generateRequestId,
  getSafReporters,
  makeServiceErrorReporter,
  safContextStorage,
  safReportersStorage,
  type SafContext,
  type SafReporters,
} from "@saflib/node";
import { cronDb } from "@saflib/cron-db";

import type { JobConfig, JobsMap } from "./types.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { JobSettingNotFoundError } from "@saflib/cron-db";

// --- Helper Function for Job Execution and Error Handling ---

async function executeJobWithHandling(
  serviceName: string,
  jobName: string,
  jobConfig: JobConfig,
  dbKey: DbKey,
) {
  const reqId = generateRequestId();
  const context: SafContext = {
    requestId: reqId,
    serviceName: serviceName + ".cron",
    operationName: jobName,
  };
  const reporters: SafReporters = {
    log: createLogger(context),
    reportError: defaultErrorReporter,
  };

  await safContextStorage.run(context, async () => {
    await safReportersStorage.run(reporters, async () => {
      const jobTimeoutSeconds = jobConfig.timeoutSeconds ?? 10;
      const timeoutMs = jobTimeoutSeconds * 1000;
      const { log, reportError } = getSafReporters();
      let statusToSet: "success" | "fail" | "timed out" = "fail"; // Default to fail

      try {
        log.info(
          `Executing job: ${jobName} with timeout ${jobTimeoutSeconds}s`,
        );
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
        log.info(`Job ${jobName} finished successfully.`);
      } catch (error) {
        reportError(error);
        const isErrorInstance = error instanceof Error;
        const errorMessage = isErrorInstance
          ? (error as Error).message
          : String(error);

        if (errorMessage.includes("timed out")) {
          reportError(new Error(errorMessage));
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
          reportError(
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
  serviceName: string;
  dbKey: DbKey;
}

export const startJobs = async (
  jobsToStart: JobsMap,
  config: StartJobConfig,
) => {
  const logger = createServiceLogger(config.serviceName);
  const reportError = makeServiceErrorReporter(config.serviceName, logger);
  const { serviceName, dbKey } = config;
  for (const [jobName, jobConfig] of Object.entries(jobsToStart)) {
    const { error } = await cronDb.jobSettings.getByName(dbKey, jobName);
    if (error) {
      if (error instanceof JobSettingNotFoundError) {
        await cronDb.jobSettings.setEnabled(dbKey, jobName, false);
      } else {
        continue;
      }
    }

    CronJob.from({
      cronTime: jobConfig.schedule,
      onTick: async () => {
        // Use schedulerLogger for logs before entering job-specific context
        const { result: currentJobSetting, error } =
          await cronDb.jobSettings.getByName(dbKey, jobName);
        if (error) {
          reportError(error);
          return;
        }
        if (!currentJobSetting.enabled) {
          return;
        }

        await executeJobWithHandling(serviceName, jobName, jobConfig, dbKey);
      },
      start: true,
    });
  }
};
