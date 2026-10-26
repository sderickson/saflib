import { castJson } from "@saflib/openapi";
import * as json from "./dist/openapi.json" with { type: "json" };

export const jsonSpec = castJson(json);
