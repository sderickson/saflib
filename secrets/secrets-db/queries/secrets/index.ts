import { create } from "./create.ts";
import { getById } from "./get-by-id.ts";
import { getByName } from "./get-by-name.ts";
import { update } from "./update.ts";
import { remove } from "./remove.ts";
import { list } from "./list.ts";

export const secrets = { create, getById, getByName, update, remove, list };
