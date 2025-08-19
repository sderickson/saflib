import { getAll } from "./get-all.ts";
import { getByName } from "./get-by-name.ts";
import { setEnabled } from "./set-enabled.ts";
import { setLastRunStatus } from "./set-last-run-status.ts";

/**
 * Queries for getting info on cron jobs, and updating them.
 */
const jobSettingsDb = {
  getAll,
  getByName,
  setEnabled,
  setLastRunStatus,
};

export { jobSettingsDb };
