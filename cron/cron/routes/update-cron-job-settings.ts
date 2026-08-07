import { createHandler } from "@saflib/express";
import type { CronRequestBody, CronResponseBody } from "@saflib/cron-spec";
import { jobSettingsDb } from "@saflib/cron-db";
import { mapJobSettingToResponse } from "./_helpers.ts";
import { cronServiceStorage } from "../context.ts";
import createError from "http-errors";
import { getSafContext } from "@saflib/node";

export const updateCronJobSettingsHandler = createHandler(
  async function (req, res) {
    const { dbKey, jobs } = cronServiceStorage.getStore()!;
    const body: CronRequestBody["updateCronJobSettings"] = req.body;
    const { auth } = getSafContext();
    const { result: updatedSetting, error } = await jobSettingsDb.setEnabled(
      dbKey,
      body.jobName,
      body.enabled,
      body.enabled ? auth?.userId : undefined,
    );
    if (error) {
      switch (true) {
        default:
          throw error satisfies never;
      }
    }

    if (!jobs[body.jobName]) {
      throw createError(404);
    }

    const response: CronResponseBody["updateCronJobSettings"][200] =
      mapJobSettingToResponse(updatedSetting, jobs[body.jobName]?.schedule);
    res.status(200).json(response);
  },
);
