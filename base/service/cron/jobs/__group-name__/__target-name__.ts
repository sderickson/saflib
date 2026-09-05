import type { JobConfig } from "@saflib/cron-http";

/**
 * Declarative cron job config. Work runs in the background operation named by
 * `enqueue.operationId` — implement that HTTP handler in the product service,
 * not here.
 */
export const __targetName__Config: JobConfig = {
  schedule: "*/15 * * * *",
  enqueue: {
    // Golden stub targets the demo background op so base/dev validates.
    // cron/add-job + UpdateStep: set to the real product operationId (must match
    // the cron-trigger-map edge in service/jobs/jobs.ts).
    operationId: "jobsDemoStepB",
  },
};
