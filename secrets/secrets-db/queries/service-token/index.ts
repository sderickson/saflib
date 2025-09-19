import { getByHash } from "./get-by-hash.ts";
import { updateApproval } from "./update-approval.ts";
import { updateUsage } from "./update-usage.ts";
import { list } from "./list.ts";
import { create } from "./create.ts";

export const serviceToken = {
  getByHash,
  updateApproval,
  updateUsage,
  list,
  create,
};
