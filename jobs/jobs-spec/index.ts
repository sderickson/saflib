import type { components, operations } from "./dist/openapi.d.ts";

export type { paths } from "./dist/openapi.d.ts";
import {
  type ExtractResponseBody,
  type ExtractRequestBody,
  castJson,
} from "@saflib/openapi";

export type JobsServiceResponseBody =
  ExtractResponseBody<operations>;
export type JobsServiceRequestBody = ExtractRequestBody<operations>;

export type Error = components["schemas"]["Error"];
export type ProductEvent = components["schemas"]["ProductEvent"];

// BEGIN WORKFLOW AREA schema-exports FOR openapi/schema

export type Job = components["schemas"]["Job"];
// END WORKFLOW AREA

import * as json from "./dist/openapi.json" with { type: "json" };

/**
 * For validating Express requests and responses.
 */
export const jsonSpec = castJson(json);
