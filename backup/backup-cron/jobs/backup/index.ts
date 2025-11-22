import type { JobsMap } from "@saflib/cron";

import { automatic } from "./automatic.ts";

export const backupJobs: JobsMap = {
  automatic: {
    schedule: "0 0 * * *",
    handler: automatic,
  },
};
