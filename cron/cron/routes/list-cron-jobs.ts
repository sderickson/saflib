import { createHandler } from "@saflib/express";
import type { CronResponse } from "@saflib/cron-spec";
import { cronDb } from "@saflib/cron-db";
import { mapJobSettingToResponse } from "./_helpers.ts";
import { cronServiceStorage } from "../context.ts";

export const listCronJobsHandler = createHandler(async function (_req, res) {
  const { dbKey } = cronServiceStorage.getStore()!;
  const jobs = await cronDb.jobSettings.getAll(dbKey);
  const response: CronResponse["listCronJobs"][200] = jobs.map(
    mapJobSettingToResponse,
  );
  res.status(200).json(response);
});
