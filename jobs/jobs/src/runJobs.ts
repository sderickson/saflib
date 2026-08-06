import {
  createLogger,
  defaultErrorReporter,
  generateRequestId,
  getServiceName,
  makeSubsystemReporters,
  safContextStorage,
  safReportersStorage,
  type SafContext,
  type SafReporters,
} from "@saflib/node";
import { createInternalCaller } from "@saflib/express";
import { jobsDb, jobQueries } from "jobs-db";
import type { JobRequest } from "jobs-db";
import {
  CLAIM_POLL_INTERVAL_MS,
  DEFAULT_TIMEOUT_MS,
  GLOBAL_CONCURRENCY,
  HEARTBEAT_INTERVAL_MS,
  RETENTION_MS,
  RETENTION_SWEEP_INTERVAL_MS,
  STALL_GRACE_MS,
  STALL_RECOVERY_INTERVAL_MS,
} from "./constants.ts";
import {
  buildOperationMap,
  validateJobsStartup,
} from "./operations.ts";
import type { JobsServiceOptions, OperationMap } from "./types.ts";
import {
  classifyDelivery,
  computeBackoffMs,
} from "./classify.ts";
import {
  setJobsQueueDepth,
  startJobsDeliveryTimer,
} from "./metrics.ts";

export interface JobsRuntimeHandle {
  /** Stop polling, wait for in-flight work, close the internal caller. */
  stop: () => Promise<void>;
  /** Immediate claim pass — enqueue handler fast path. */
  wake: () => void;
}

/** Module-level wake hook for the in-process enqueue → runtime signal. */
let activeWake: (() => void) | undefined;

/**
 * Signal the running jobs runtime to claim immediately (no-op if none running).
 * Enqueue handlers call this after a successful create.
 */
export function signalJobsWake(): void {
  activeWake?.();
}

function resolvePath(
  pathTemplate: string,
  pathParams: Record<string, unknown> | undefined,
): string {
  if (!pathParams) {
    return pathTemplate;
  }
  return pathTemplate.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const value = pathParams[name];
    if (value == null) {
      throw new Error(`Missing path param "${name}" for ${pathTemplate}`);
    }
    return encodeURIComponent(String(value));
  });
}

function queryToStrings(
  query: JobRequest["query"],
): Record<string, string> | undefined {
  if (!query) {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value == null) {
      continue;
    }
    out[key] = String(value);
  }
  return out;
}

function maxConfiguredTimeoutMs(options: JobsServiceOptions): number {
  let max = DEFAULT_TIMEOUT_MS;
  for (const config of Object.values(options.operationConfig ?? {})) {
    if (config.timeoutMs != null && config.timeoutMs > max) {
      max = config.timeoutMs;
    }
  }
  return max;
}

function timeoutForOperation(
  operationId: string,
  options: JobsServiceOptions,
): number {
  return (
    options.operationConfig?.[operationId]?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );
}

/**
 * Start the jobs claim loop, delivery workers, and periodic sweeps.
 * Validates the trigger map / operation config against `apiSpec` at startup.
 */
export async function runJobs(
  options: JobsServiceOptions,
): Promise<JobsRuntimeHandle> {
  const { log, logError } = makeSubsystemReporters("init", "runJobs");
  log.info("Starting jobs service...");

  const operations = buildOperationMap(options.apiSpec);
  validateJobsStartup({
    triggerMap: options.triggerMap,
    operationConfig: options.operationConfig,
    operations,
  });

  const dbKey = options.dbKey ?? jobsDb.connect(options.dbOptions);
  const caller = createInternalCaller({ socketPath: options.targetSocketPath });

  let stopped = false;
  let claimScheduled = false;
  let inFlight = 0;
  const inFlightWaiters: Array<() => void> = [];

  const notifyIdle = () => {
    if (inFlight === 0) {
      for (const resolve of inFlightWaiters.splice(0)) {
        resolve();
      }
    }
  };

  const waitForIdle = () =>
    inFlight === 0
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          inFlightWaiters.push(resolve);
        });

  const scheduleClaimPass = () => {
    if (stopped || claimScheduled) {
      return;
    }
    claimScheduled = true;
    queueMicrotask(() => {
      claimScheduled = false;
      void claimPass();
    });
  };

  const wake = () => {
    if (!stopped) {
      scheduleClaimPass();
    }
  };
  activeWake = wake;

  async function recoverStalled(now: Date): Promise<void> {
    const cutoff = new Date(
      now.getTime() - (maxConfiguredTimeoutMs(options) + STALL_GRACE_MS),
    );
    const { error } = await jobQueries.recoverStalledJob(dbKey, {
      cutoff,
      now,
    });
    if (error) {
      logError(error);
    }
  }

  async function retentionSweep(now: Date): Promise<void> {
    const cutoff = new Date(now.getTime() - RETENTION_MS);
    const { error } = await jobQueries.deleteExpiredTerminalJob(dbKey, {
      cutoff,
    });
    if (error) {
      logError(error);
    }
  }

  async function sampleQueueDepth(): Promise<void> {
    const { result, error } = await jobQueries.countByStatusJob(dbKey);
    if (error) {
      logError(error);
      return;
    }
    if (result) {
      setJobsQueueDepth(result);
    }
  }

  async function deliverOne(
    job: NonNullable<
      Awaited<ReturnType<typeof jobQueries.claimNextJob>>["result"]
    >,
    ops: OperationMap,
  ): Promise<void> {
    const requestId = generateRequestId();
    const context: SafContext = {
      requestId,
      serviceName: getServiceName(),
      subsystemName: "jobs",
      operationName: job.operationId,
      originalRequestId: job.originalRequestId,
    };
    const reporters: SafReporters = {
      log: createLogger(context),
      logError: defaultErrorReporter,
    };

    await safContextStorage.run(context, async () => {
      await safReportersStorage.run(reporters, async () => {
        const endTimer = startJobsDeliveryTimer(job.operationId);
        const resolved = ops.get(job.operationId);
        const now = () => new Date();

        if (!resolved) {
          const { error } = await jobQueries.recordAttemptResultJob(dbKey, {
            id: job.id,
            now: now(),
            outcome: "dead",
            result: {
              terminalReason: "permanent-status",
              errorBody: `Unknown operationId "${job.operationId}"`,
            },
          });
          if (error) {
            logError(error);
          }
          endTimer("dead");
          return;
        }

        const timeoutMs = timeoutForOperation(job.operationId, options);
        const controller = new AbortController();
        const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

        const heartbeatHandle = setInterval(() => {
          void jobQueries.heartbeatJob(dbKey, {
            id: job.id,
            now: now(),
          }).then(({ error }) => {
            if (error) {
              logError(error);
            }
          });
        }, HEARTBEAT_INTERVAL_MS);

        let timedOut = false;
        let networkError = false;
        let response: Response | undefined;
        let errorBody: string | undefined;

        try {
          const path = resolvePath(
            resolved.pathTemplate,
            job.request.pathParams,
          );
          response = await caller({
            operationId: job.operationId,
            method: resolved.method,
            path,
            body: job.request.body,
            query: queryToStrings(job.request.query),
            asUser: { userId: job.userId },
            requestId,
            claims: {
              jobId: job.id,
              originalRequestId: job.originalRequestId,
            },
            signal: controller.signal,
          });
        } catch (err) {
          if (controller.signal.aborted) {
            timedOut = true;
            errorBody = `delivery timed out after ${timeoutMs}ms`;
          } else {
            networkError = true;
            errorBody = err instanceof Error ? err.message : String(err);
          }
        } finally {
          clearTimeout(timeoutHandle);
          clearInterval(heartbeatHandle);
        }

        const classification = await classifyDelivery({
          timedOut,
          networkError,
          response,
          errorBody,
          attempt: job.attempt,
          maxAttempts: job.maxAttempts,
          now: now(),
        });

        const recordedAt = now();
        if (classification.kind === "succeeded") {
          const { error } = await jobQueries.recordAttemptResultJob(dbKey, {
            id: job.id,
            now: recordedAt,
            outcome: "succeeded",
            result: { statusCode: classification.statusCode },
          });
          if (error) {
            logError(error);
          }
        } else if (classification.kind === "retry") {
          const backoffMs = Math.max(
            computeBackoffMs(job.attempt),
            classification.retryAfterMs ?? 0,
          );
          const { error } = await jobQueries.recordAttemptResultJob(dbKey, {
            id: job.id,
            now: recordedAt,
            outcome: "retry",
            runAt: new Date(recordedAt.getTime() + backoffMs),
            result: {
              statusCode: classification.statusCode,
              errorBody: classification.errorBody,
            },
          });
          if (error) {
            logError(error);
          }
        } else {
          const { error } = await jobQueries.recordAttemptResultJob(dbKey, {
            id: job.id,
            now: recordedAt,
            outcome: "dead",
            result: {
              statusCode: classification.statusCode,
              errorBody: classification.errorBody,
              terminalReason: classification.terminalReason,
            },
          });
          if (error) {
            logError(error);
          }
        }

        endTimer(classification.metricStatus);
      });
    });
  }

  async function claimPass(): Promise<void> {
    if (stopped) {
      return;
    }

    while (!stopped && inFlight < GLOBAL_CONCURRENCY) {
      const { result: job, error } = await jobQueries.claimNextJob(dbKey, {
        now: new Date(),
      });
      if (error) {
        logError(error);
        break;
      }
      if (!job) {
        break;
      }

      inFlight += 1;
      void deliverOne(job, operations)
        .catch((err) => {
          logError(err);
        })
        .finally(() => {
          inFlight -= 1;
          notifyIdle();
          if (!stopped) {
            scheduleClaimPass();
          }
        });
    }
  }

  // Startup: recover stalled, sample depth, then begin polling.
  await recoverStalled(new Date());
  await sampleQueueDepth();
  scheduleClaimPass();

  const pollTimer = setInterval(() => {
    scheduleClaimPass();
  }, CLAIM_POLL_INTERVAL_MS);

  const stallTimer = setInterval(() => {
    void recoverStalled(new Date()).then(() => sampleQueueDepth());
  }, STALL_RECOVERY_INTERVAL_MS);

  const retentionTimer = setInterval(() => {
    void retentionSweep(new Date());
  }, RETENTION_SWEEP_INTERVAL_MS);

  log.info("Jobs service startup complete.");

  return {
    wake,
    stop: async () => {
      if (stopped) {
        return;
      }
      stopped = true;
      if (activeWake === wake) {
        activeWake = undefined;
      }
      clearInterval(pollTimer);
      clearInterval(stallTimer);
      clearInterval(retentionTimer);
      await waitForIdle();
      await caller.close();
      log.info("Jobs service stopped.");
    },
  };
}

/** @internal test helper — clear module wake registration. */
export function _resetJobsWakeForTests(): void {
  activeWake = undefined;
}
