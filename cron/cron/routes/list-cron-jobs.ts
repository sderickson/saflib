import { createHandler } from "@saflib/express";
import type { CronResponseBody } from "@saflib/cron-spec";

import { mapJobSettingToResponse } from "./_helpers.ts";
import { cronServiceStorage } from "../context.ts";

import { getAll } from "@saflib/cron-db";
export const listCronJobsHandler = createHandler(async function (_req, res) {
  const { dbKey, jobs: jobsMap } = cronServiceStorage.getStore()!;
  const { result: jobs, error } = await getAll(dbKey);
  if (error) {
    switch (true) {
      default:
        throw error satisfies never;
    }
  }
  const response: CronResponseBody["listCronJobs"][200] = jobs.map((setting) =>
    mapJobSettingToResponse(setting, jobsMap[setting.jobName]?.schedule),
  );
  res.status(200).json(response);
});
