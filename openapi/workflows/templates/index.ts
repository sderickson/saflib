import type { components, operations } from "./dist/openapi.d.ts";

export type { paths } from "./dist/openapi.d.ts";
import {
  type ExtractResponseBody,
  type ExtractRequestBody,
  castJson,
} from "@saflib/openapi";

export type __ServiceName__ServiceResponseBody =
  ExtractResponseBody<operations>;
export type __ServiceName__ServiceRequestBody = ExtractRequestBody<operations>;

export type Error = components["schemas"]["Error"];
export type ProductEvent = components["schemas"]["ProductEvent"];

// BEGIN SORTED WORKFLOW AREA schema-exports FOR openapi/add-schema
export type __TargetName__ = components["schemas"]["__TargetName__"];
// END WORKFLOW AREA

import * as json from "./dist/openapi.json" with { type: "json" };

/**
 * For validating Express requests and responses.
 */
export const jsonSpec = castJson(json);
