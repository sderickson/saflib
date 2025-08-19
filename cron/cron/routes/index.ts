import express from "express";
import { listCronJobsHandler } from "./list-cron-jobs.ts";
import { updateCronJobSettingsHandler } from "./update-cron-job-settings.ts";
import { createScopedMiddleware } from "@saflib/express";
import { jsonSpec } from "@saflib/cron-spec";

const router = express.Router();

// Define routes based on cron_routes.yaml
router.use(
  "/cron",
  createScopedMiddleware({
    apiSpec: jsonSpec,
  }),
);
router.get("/cron/jobs", listCronJobsHandler);
router.put("/cron/jobs/settings", updateCronJobSettingsHandler);

export { router as cronRouter };
