import { create } from "./create.ts";
import { getById } from "./get-by-id.ts";
import { updateStatus } from "./update-status.ts";
import { updateUsage } from "./update-usage.ts";
import { listPending } from "./list-pending.ts";

export const accessRequest = {
  create,
  getById,
  updateStatus,
  updateUsage,
  listPending,
};
