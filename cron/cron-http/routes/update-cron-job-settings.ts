import { createHandler } from "@saflib/express";
import type { CronRequestBody, CronResponseBody } from "@saflib/cron-spec";

import { mapJobSettingToResponse } from "./_helpers.ts";
import { cronServiceStorage } from "../context.ts";
import createError from "http-errors";
import { getSafContext } from "@saflib/node";

import { setEnabled } from "@saflib/cron-db";
export const updateCronJobSettingsHandler = createHandler(
  async function (req, res) {
    const { dbKey, jobs } = cronServiceStorage.getStore()!;
    const body: CronRequestBody["updateCronJobSettings"] = req.body;
    const { auth } = getSafContext();
    const { result: updatedSetting, error } = await setEnabled(
      dbKey,
      body.job_name,
      body.enabled,
      body.enabled ? auth?.userId : undefined,
    );
    if (error) {
      switch (true) {
        default:
          throw error satisfies never;
      }
    }

    if (!jobs[body.job_name]) {
      throw createError(404);
    }

    const response: CronResponseBody["updateCronJobSettings"][200] =
      mapJobSettingToResponse(updatedSetting, jobs[body.job_name]?.schedule);
    res.status(200).json(response);
  },
);
