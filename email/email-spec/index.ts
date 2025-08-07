import * as json from "./dist/openapi.json" with { type: "json" };
import type { paths, operations, components } from "./dist/openapi.d.ts";
import {
  type ExtractRequestBody,
  type ExtractRequestQueryParams,
  type ExtractResponseBody,
  castJson,
} from "@saflib/openapi";

// Export the JSON spec for middleware
export const jsonSpec = castJson(json);

// Export generated types for consumers
export type { paths, operations, components };

// Export common component schemas for convenience
export type SentEmail = components["schemas"]["SentEmail"];

// Export Request/Response schema types derived from operations
export type EmailResponse = ExtractResponseBody<operations>;
export type EmailRequest = ExtractRequestBody<operations>;
export type EmailQuery = ExtractRequestQueryParams<operations>;
