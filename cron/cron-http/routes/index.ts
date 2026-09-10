import express from "express";
import { listCronJobsHandler } from "./list-cron-jobs.ts";
import { updateCronJobSettingsHandler } from "./update-cron-job-settings.ts";
import { createScopedMiddleware } from "@saflib/express";
import { jsonSpec } from "@saflib/cron-spec";

/** Routes under the `/cron` mount (paths are relative to `/cron`). */
const router = express.Router();

router.use(
  ...createScopedMiddleware({
    apiSpec: jsonSpec,
    adminRequired: true,
  }),
);
router.get("/jobs", listCronJobsHandler);
router.put("/jobs/settings", updateCronJobSettingsHandler);

export { router as cronRouter };
