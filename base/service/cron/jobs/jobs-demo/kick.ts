import type { JobConfig } from "@saflib/cron";

/** Periodic kick that enqueues the jobs demo step-b (disabled until enabled in admin). */
export const jobsDemoKickConfig: JobConfig = {
  schedule: "*/15 * * * *",
  enqueue: {
    operationId: "jobsDemoStepB",
    dedupeKey: "cron:jobsDemoKick",
  },
};
