import { getAll, type GetAllResult } from "./get-all.ts";
import { getByName, type GetByNameResult } from "./get-by-name.ts";
import { setEnabled, type SetEnabledResult } from "./set-enabled.ts";
import { setLastRunStatus, type SetLastRunStatusResult } from "./set-last-run-status.ts";
import type { JobSetting } from "../../schema.ts";

/**
 * Queries for getting info on cron jobs, and updating them.
 */
const jobSettingsDb = {
  getAll,
  getByName,
  setEnabled,
  setLastRunStatus,
};

export {
  jobSettingsDb,
  type GetAllResult,
  type GetByNameResult,
  type SetEnabledResult,
  type SetLastRunStatusResult,
  type JobSetting,
};
