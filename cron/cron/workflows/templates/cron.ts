import { runCron, type JobsMap } from "@saflib/cron";
import {
  __serviceName__ServiceStorage,
  type __ServiceName__ServiceContext,
} from "template-package-service-common";

// TODO: Import and add jobs here
export const __serviceName__Jobs: JobsMap = {
  // Add more jobs as needed
};

export const run__ServiceName__Cron = (
  context: __ServiceName__ServiceContext,
) => {
  return __serviceName__ServiceStorage.run(context, () =>
    runCron({
      jobs: __serviceName__Jobs,
      dbKey: context.__serviceName__DbKey,
    }),
  );
};
