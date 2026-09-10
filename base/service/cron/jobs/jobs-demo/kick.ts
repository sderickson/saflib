import type { JobConfig } from "@saflib/cron-http";

/** Periodic kick that enqueues the jobs demo step-b (disabled until enabled in admin). */
export const jobsDemoKickConfig: JobConfig = {
  schedule: "*/15 * * * *",
  enqueue: {
    operationId: "jobsDemoStepB",
    dedupeKey: "cron:jobsDemoKick",
  },
};
