import * as json from "./dist/openapi.json" with { type: "json" };
import type { paths, operations, components } from "./dist/openapi.d.ts";
import {
  type ExtractRequestBody,
  type ExtractResponseBody,
  type ExtractRequestQueryParams,
  castJson,
} from "@saflib/openapi";

export const jsonSpec = castJson(json);

export type { paths };

export type ProductEventRecord = components["schemas"]["ProductEventRecord"];

export type AnalyticsResponseBody = ExtractResponseBody<operations>;
export type AnalyticsRequestBody = ExtractRequestBody<operations>;
export type AnalyticsRequestQuery = ExtractRequestQueryParams<operations>;
