import { jobsDb } from "@saflib/jobs-db";
import {
  runJobs,
  validateCronTriggerKeys,
  type JobOperationConfigMap,
  type TriggerMap,
} from "@saflib/jobs-http";
import { createOnDiskDbKeyAccessor } from "@saflib/drizzle";
import { typedEnv } from "@saflib/env";
import type { OpenApiDocument } from "@saflib/openapi";
import {
  baseServiceStorage,
  type BaseServiceContext,
} from "@saflib/base-service-common/context";
import { baseJobs } from "@saflib/base-cron";
import { operationJsonSpec as raiseTestErrorMaintenanceOperationJsonSpec } from "@saflib/errors-spec/operations/raiseTestErrorMaintenance";
import { operationJsonSpec as runOpsDiagnosticProbeOperationJsonSpec } from "@saflib/ops-spec/operations/runOpsDiagnosticProbe";

/**
 * Reviewed map of which base operations may enqueue which operations.
 * Validated against the bundled OpenAPI spec at startup.
 */
export const baseTriggerMap: TriggerMap = {
  // The admin's Diagnostics self-test enqueues a job that fails on purpose.
  runOpsDiagnosticProbe: ["raiseTestErrorMaintenance"],
  startJobsDemo: ["jobsDemoStepB"],
  jobsDemoStepB: ["jobsDemoStepC"],
  // HTTP/API callers → background targets (jobs/add-job).
  // BEGIN WORKFLOW AREA trigger-map FOR jobs/add-job
  // END WORKFLOW AREA
  "cron:jobsDemoKick": ["jobsDemoStepB"],
  // Cron job names → background targets (cron/add-job). Template stub uses the
  // demo step so the golden product validates; replace operationId when adding.
  // BEGIN WORKFLOW AREA cron-trigger-map FOR cron/add-job
  "cron:__targetName__": ["jobsDemoStepB"],
  // END WORKFLOW AREA
};

/** Per-target overrides (≤ 120s ceiling). */
export const baseJobOperations: JobOperationConfigMap = {
  jobsDemoStepB: { timeoutMs: 30_000, maxAttempts: 5 },
  jobsDemoStepC: { timeoutMs: 30_000 },
  raiseTestErrorMaintenance: { timeoutMs: 30_000 },
};

/**
 * Every OpenAPI document jobs may target or be enqueued from: the product's
 * own spec, plus the errors test operation and the ops self-test (so the
 * Diagnostics failing-job probe validates).
 */
export const baseJobsApiSpec = (productSpec: OpenApiDocument): OpenApiDocument[] => [
  productSpec,
  raiseTestErrorMaintenanceOperationJsonSpec as unknown as OpenApiDocument,
  runOpsDiagnosticProbeOperationJsonSpec as unknown as OpenApiDocument,
];

const jobsDbAccessor = createOnDiskDbKeyAccessor({
  packageUrl: import.meta.url,
  filePrefix: "jobs-db",
  connect: jobsDb.connect,
});

/** Opaque key for `@saflib/jobs-db` (separate from the main app DB). */
export const getBaseJobsDbKey = jobsDbAccessor.getDbKey;

/**
 * Validates `baseTriggerMap` / `baseJobOperations` against `apiSpec` (the
 * product's OpenAPI document, passed in by the composition root) and `cron:`
 * trigger keys against registered `baseJobs`, then starts the jobs runtime.
 */
export const runBaseJobs = (
  context: BaseServiceContext,
  apiSpec: OpenApiDocument,
) => {
  return baseServiceStorage.run(context, async () => {
    validateCronTriggerKeys(baseTriggerMap, Object.keys(baseJobs));

    return runJobs({
      triggerMap: baseTriggerMap,
      operationConfig: baseJobOperations,
      apiSpec: baseJobsApiSpec(apiSpec),
      targetSocketPath:
        (
          typedEnv as {
            BASE_SERVICE_INTERNAL_SOCKET?: string;
          }
        ).BASE_SERVICE_INTERNAL_SOCKET ?? "/tmp/base-internal.sock",
      dbKey: getBaseJobsDbKey(),
    });
  });
};
