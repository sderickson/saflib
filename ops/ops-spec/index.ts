import * as json from "./dist/openapi.json" with { type: "json" };
import type { paths, operations, components } from "./dist/openapi.d.ts";
import {
  type ExtractRequestBody,
  type ExtractResponseBody,
  castJson,
} from "@saflib/openapi";

/**
 * For validating Express requests and responses.
 */
export const jsonSpec = castJson(json);

export type { paths };

export type OpsHealth = components["schemas"]["OpsHealth"];
export type OpsHealthCheck = components["schemas"]["OpsHealthCheck"];
export type OpsTokenResponse = components["schemas"]["OpsToken"];
export type OpsBootResponse = components["schemas"]["OpsBoot"];
export type OpsLogEntryResponse = components["schemas"]["OpsLogEntry"];
export type OpsLogTemplateResponse = components["schemas"]["OpsLogTemplate"];

/** Response bodies for ops API routes, by operationId and status. */
export type OpsResponseBody = ExtractResponseBody<operations>;

/** Request bodies for ops API routes, by operationId. */
export type OpsRequestBody = ExtractRequestBody<operations>;
