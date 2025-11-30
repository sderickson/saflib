import type { JobsMap } from "@saflib/cron";

import { automatic } from "./automatic.ts";
import { cleanup } from "./cleanup.ts";

export const backupJobs: JobsMap = {
  automatic: {
    schedule: "0 0 * * *",
    handler: automatic,
  },
  cleanup: {
    schedule: "0 1 * * *",
    handler: cleanup,
  },
};
