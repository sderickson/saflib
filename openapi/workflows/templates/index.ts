import type { components, operations } from "./dist/openapi.d.ts";

export type { paths } from "./dist/openapi.d.ts";
import {
  type ExtractResponseBody,
  type ExtractRequestBody,
  castJson,
} from "@saflib/openapi";

/**
 * For typing Express responses for template-service API routes.
 */
export type TemplateServiceResponseBody = ExtractResponseBody<operations>;

/**
 * For typing Express requests for template-service API routes.
 */
export type TemplateServiceRequestBody = ExtractRequestBody<operations>;

// Export your schema types here
export type TemplateResource = components["schemas"]["Error"];

import * as json from "./dist/openapi.json" with { type: "json" };

/**
 * For validating Express requests and responses.
 */
export const jsonSpec = castJson(json);
