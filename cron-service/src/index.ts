import { CronJob } from "cron";
import { AsyncLocalStorage } from "node:async_hooks";
import { createLogger, generateRequestId, type Logger } from "@saflib/node";
import { cronDb } from "@saflib/cron-db";

import type { JobConfig, JobsMap } from "./types.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { JobSettingNotFoundError } from "@saflib/cron-db";

// --- Setup Logger and AsyncLocalStorage ---

const loggerContext = new AsyncLocalStorage<Logger>();

// Base logger for scheduler-level events (outside specific job executions)
const schedulerLogger = createLogger("cron-scheduler");

// Helper to get logger, falling back to scheduler logger if context is missing
const getLogger = (): Logger => {
  return loggerContext.getStore() ?? schedulerLogger;
};

// --- Helper Function for Job Execution and Error Handling ---

async function executeJobWithHandling(
  jobName: string,
  jobConfig: JobConfig,
  dbKey: DbKey,
) {
  const reqId = generateRequestId();
  const jobLogger = createLogger(reqId);

  await loggerContext.run(jobLogger, async () => {
    const logger = getLogger(); // Get logger specific to this job execution
    const jobTimeoutSeconds = jobConfig.timeoutSeconds ?? 10;
    const timeoutMs = jobTimeoutSeconds * 1000;
    let statusToSet: "success" | "fail" | "timed out" = "fail"; // Default to fail

    try {
      logger.info(
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
      logger.info(`Job ${jobName} finished successfully.`);
    } catch (error) {
      const isErrorInstance = error instanceof Error;
      const errorMessage = isErrorInstance
        ? (error as Error).message
        : String(error);

      if (errorMessage.includes("timed out")) {
        logger.error(errorMessage);
        statusToSet = "timed out";
      } else {
        logger.error(
          `Error during execution of job ${jobName}: ${errorMessage}`,
          isErrorInstance ? { error } : undefined, // Log the full error object if available
        );
        statusToSet = "fail";
      }
    } finally {
      try {
        await cronDb.jobSettings.setLastRunStatus(dbKey, jobName, statusToSet);
      } catch (dbError) {
        logger.error(
          `CRITICAL: Failed to set final job status to '${statusToSet}' for ${jobName}. DB Error: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
          { error: dbError }, // Log the DB error object
        );
      }
    }
  });
}

// --- Main Job Scheduling Logic ---

export const startJobs = async (jobsToStart: JobsMap, dbKey: DbKey) => {
  schedulerLogger.info(
    `Found ${Object.keys(jobsToStart).length} jobs defined.`,
  );

  for (const [jobName, jobConfig] of Object.entries(jobsToStart)) {
    const { error } = await cronDb.jobSettings.getByName(dbKey, jobName);
    if (error) {
      if (error instanceof JobSettingNotFoundError) {
        schedulerLogger.warn(
          `Job setting for '${jobName}' not found in DB. Creating default (disabled).`,
        );
        await cronDb.jobSettings.setEnabled(dbKey, jobName, false);
      } else {
        schedulerLogger.error(
          `Failed to retrieve initial job setting for '${jobName}'. Skipping job.`,
          { error },
        );
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
          if (error instanceof JobSettingNotFoundError) {
            schedulerLogger.error(
              `Job setting for '${jobName}' not found during tick. Skipping execution.`,
            );
          } else {
            schedulerLogger.error(
              `Error fetching job setting for '${jobName}' during tick. Skipping execution.`,
              { error },
            );
          }
          return;
        }
        if (!currentJobSetting.enabled) {
          schedulerLogger.info(`Job '${jobName}' is disabled. Skipping tick.`);
          return;
        }

        // Now execute the job, which will run in its own logger context
        await executeJobWithHandling(jobName, jobConfig, dbKey);
      },
      start: true,
    });

    schedulerLogger.info(
      `Scheduled job: ${jobName} with schedule ${jobConfig.schedule}`,
    );
  }
};
