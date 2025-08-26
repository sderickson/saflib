import type { components, operations } from "./dist/openapi.d.ts";

export type { paths } from "./dist/openapi.d.ts";
import {
  type ExtractResponseBody,
  type ExtractRequestBody,
  castJson,
} from "@saflib/openapi";

/**
 * For typing Express responses for identity API routes.
 */
export type IdentityResponseBody = ExtractResponseBody<operations>;

/**
 * For typing Express requests for identity API routes.
 */
export type IdentityRequestBody = ExtractRequestBody<operations>;

/**
 * The User type from the OpenAPI specification.
 */
export type User = components["schemas"]["User"];

import * as json from "./dist/openapi.json" with { type: "json" };

/**
 * For validating Express requests and responses.
 */
export const jsonSpec = castJson(json);
