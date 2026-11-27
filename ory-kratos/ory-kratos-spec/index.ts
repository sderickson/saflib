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

export type IdentitySummary = components["schemas"]["IdentitySummary"];
export type IdentityRecord = components["schemas"]["IdentityRecord"];

export type KratosAdminResponseBody = ExtractResponseBody<operations>;
export type KratosAdminRequestBody = ExtractRequestBody<operations>;
export type KratosAdminRequestQuery = ExtractRequestQueryParams<operations>;
