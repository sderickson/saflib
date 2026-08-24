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

export type AuditLog = components["schemas"]["AuditLog"];

export type AuditResponseBody = ExtractResponseBody<operations>;
export type AuditRequestBody = ExtractRequestBody<operations>;
export type AuditRequestQuery = ExtractRequestQueryParams<operations>;
