import express from "express";
import { listCronJobsHandler } from "./list-cron-jobs.ts";
import { updateCronJobSettingsHandler } from "./update-cron-job-settings.ts";

const router = express.Router();

// Define routes based on cron_routes.yaml
router.get("/jobs", listCronJobsHandler);
router.put("/jobs/settings", updateCronJobSettingsHandler);

export { router as cronRouter };
