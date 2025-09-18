import { create } from "./create.ts";
import { getById } from "./get-by-id.ts";
import { getByName } from "./get-by-name.ts";
import { update } from "./update.ts";

export const secrets = { create, getById, getByName, update };
