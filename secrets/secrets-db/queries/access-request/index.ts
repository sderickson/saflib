import { create } from "./create.ts";
import { getById } from "./get-by-id.ts";
import { updateStatus } from "./update-status.ts";
import { updateUsage } from "./update-usage.ts";
import { listPending } from "./list-pending.ts";
import { listByService } from "./list-by-service.ts";
import { list } from "./list.ts";
import { lookup } from "./lookup.ts";

export const accessRequestQueries = {
  create,
  getById,
  updateStatus,
  updateUsage,
  listPending,
  listByService,
  list,
  lookup,
};
