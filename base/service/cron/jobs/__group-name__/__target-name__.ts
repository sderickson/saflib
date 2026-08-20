import type { JobConfig } from "@saflib/cron";

/**
 * Declarative cron job config. Work runs in the background operation named by
 * `enqueue.operationId` — implement that HTTP handler in the product service,
 * not here.
 */
export const __targetName__Config: JobConfig = {
  schedule: "*/15 * * * *",
  enqueue: {
    operationId: "__targetName__", // TODO: product background operationId
  },
};
