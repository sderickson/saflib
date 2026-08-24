import type { operations, components, paths } from "./openapi.d.ts";
import * as json from "./openapi.json" with { type: "json" };
import {
  castJson,
  type ExtractResponseBody,
  type ExtractRequestBody,
  type ExtractRequestPathParams,
  type ExtractRequestQueryParams,
} from "@saflib/openapi";

export type { operations, components, paths };

/** OpenAPI document for a single operation — use with createScopedMiddleware. */
export const operationJsonSpec = castJson(json);

export type ResponseBody = ExtractResponseBody<operations>;
export type RequestBody = ExtractRequestBody<operations>;
export type PathParams = ExtractRequestPathParams<operations>;
export type QueryParams = ExtractRequestQueryParams<operations>;

export const operationId = "listDevLogs" as const;
