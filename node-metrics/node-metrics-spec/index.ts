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

export type MetricSnapshot = components["schemas"]["MetricSnapshot"];

export type MetricsResponseBody = ExtractResponseBody<operations>;
export type MetricsRequestBody = ExtractRequestBody<operations>;
export type MetricsRequestQuery = ExtractRequestQueryParams<operations>;
