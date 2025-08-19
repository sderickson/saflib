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

export type JobSettings = components["schemas"]["JobSettings"];

/**
 * For typing Express responses for cron API routes.
 */
export type CronResponseBody = ExtractResponseBody<operations>;

/**
 * For typing Express requests for cron API routes.
 */
export type CronRequestBody = ExtractRequestBody<operations>;
