import { getByHash } from "./get-by-hash.ts";
import { updateApproval } from "./update-approval.ts";
import { updateUsage } from "./update-usage.ts";

export const serviceToken = { getByHash, updateApproval, updateUsage };
