import { getAll } from "./get-all.ts";
import { getByName } from "./get-by-name.ts";
import { setEnabled } from "./set-enabled.ts";
import { setLastRunStatus } from "./set-last-run-status.ts";

const jobSettings = {
  getAll,
  getByName,
  setEnabled,
  setLastRunStatus,
};

export { jobSettings };
