import type { JobsMap } from "@saflib/cron";

import { __targetName__ } from "./__target-name__.ts";

export const __groupName__Jobs: JobsMap = {
  __targetName__: {
    schedule: "*/10 * * * * *",
    handler: __targetName__,
  },
};
