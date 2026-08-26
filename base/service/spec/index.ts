import type { components } from "./dist/openapi.d.ts";

export type { paths } from "./dist/openapi.d.ts";
import { castJson } from "@saflib/openapi";

// Export your schema types here
export type Error = components["schemas"]["Error"];
export type ProductEvent = components["schemas"]["ProductEvent"];
export type { components } from "./dist/openapi.d.ts";

import * as json from "./dist/openapi.json" with { type: "json" };

/**
 * For validating Express requests and responses.
 */
export const jsonSpec = castJson(json);
