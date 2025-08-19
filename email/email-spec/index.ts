import * as json from "./dist/openapi.json" with { type: "json" };
import type { paths, operations, components } from "./dist/openapi.d.ts";
import {
  type ExtractRequestBody,
  type ExtractRequestQueryParams,
  type ExtractResponseBody,
  castJson,
} from "@saflib/openapi";

/**
 * For validating Express requests and responses.
 */

export const jsonSpec = castJson(json);

export type { paths };

export type SentEmail = components["schemas"]["SentEmail"];

/**
 * For typing Express responses for email API routes.
 */
export type EmailResponseBody = ExtractResponseBody<operations>;

/**
 * For typing Express requests for email API routes.
 */
export type EmailRequestBody = ExtractRequestBody<operations>;

/**
 * For typing Express query params for email API routes.
 */
export type EmailRequestQuery = ExtractRequestQueryParams<operations>;
