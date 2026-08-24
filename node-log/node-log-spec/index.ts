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

export type DevLogEntry = components["schemas"]["DevLogEntry"];

export type DevLogResponseBody = ExtractResponseBody<operations>;
export type DevLogRequestBody = ExtractRequestBody<operations>;
export type DevLogRequestQuery = ExtractRequestQueryParams<operations>;
