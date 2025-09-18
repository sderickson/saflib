import { create } from "./create.ts";
import { getById } from "./get-by-id.ts";
import { updateStatus } from "./update-status.ts";

export const accessRequest = { create, getById, updateStatus };
