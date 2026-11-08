import { castJson } from "@saflib/openapi";
import * as json from "./openapi.json" with { type: "json" };

/** Complete OpenAPI document for this package, e.g. for request/response validation. */
export const jsonSpec = castJson(json);
