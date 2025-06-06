import * as json from "./dist/openapi.json" with { type: "json" };
import type { paths, operations, components } from "./dist/openapi.d.ts";
import {
  type ExtractRequestBody,
  type ExtractResponseBody,
  castJson,
} from "@saflib/openapi-specs";

// Export the JSON spec for middleware
export const jsonSpec = castJson(json);

// Export generated types for consumers
export type { paths, operations, components };

// Export common component schemas for convenience
export type JobSettings = components["schemas"]["JobSettings"];

// Export Request/Response schema types derived from operations
export type CronResponse = ExtractResponseBody<operations>;
export type CronRequest = ExtractRequestBody<operations>;
