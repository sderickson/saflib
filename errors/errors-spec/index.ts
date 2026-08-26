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

export type ReportedError = components["schemas"]["ReportedError"];

export type ErrorsResponseBody = ExtractResponseBody<operations>;
export type ErrorsRequestBody = ExtractRequestBody<operations>;
export type ErrorsRequestQuery = ExtractRequestQueryParams<operations>;
