import type { ResponseBody as raiseTestErrorMaintenanceResponseBody } from "@saflib/errors-spec/operations/raiseTestErrorMaintenance";
import { createHandler } from "./handler.ts";

/** Header value for jobs that must never be retried (`X-Jobs-Retry: never`). */
export const JOBS_RETRY_NEVER_HEADER = "never" as const;

/**
 * Intentional 500 probe for the jobs chain. Always sets `X-Jobs-Retry: never`
 * so the queue marks the job `dead` without retries.
 */
export function createRaiseTestErrorMaintenanceHandler() {
  return createHandler(async (_req, res) => {
    res.setHeader("X-Jobs-Retry", JOBS_RETRY_NEVER_HEADER);
    const response: raiseTestErrorMaintenanceResponseBody["raiseTestErrorMaintenance"][500] =
      {
        message: "Intentional raise-test-error maintenance probe",
      };
    res.status(500).json(response);
  });
}
