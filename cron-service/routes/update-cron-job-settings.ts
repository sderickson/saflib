import { createHandler } from "@saflib/express";
import type { CronRequest, CronResponse } from "@saflib/cron-spec";
import { cronDb } from "@saflib/cron-db";
import { mapJobSettingToResponse } from "./_helpers.ts";
import { cronServiceStorage } from "../context.ts";
import createError from "http-errors";
export const updateCronJobSettingsHandler = createHandler(
  async function (req, res) {
    const { dbKey, jobs } = cronServiceStorage.getStore()!;
    const body: CronRequest["updateCronJobSettings"] = req.body;
    const updatedSetting = await cronDb.jobSettings.setEnabled(
      dbKey,
      body.jobName,
      body.enabled,
    );

    if (!jobs[body.jobName]) {
      throw createError(404);
    }

    const response: CronResponse["updateCronJobSettings"][200] =
      mapJobSettingToResponse(updatedSetting);
    res.status(200).json(response);
  },
);
