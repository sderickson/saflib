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

export type Error = components["schemas"]["Error"];
export type Commit = components["schemas"]["Commit"];
export type CommitSummary = components["schemas"]["CommitSummary"];
export type CommitDetail = components["schemas"]["CommitDetail"];
export type CommitDiff = components["schemas"]["CommitDiff"];
export type PackageMetrics = components["schemas"]["PackageMetrics"];
export type ExportEntry = components["schemas"]["ExportEntry"];
export type TestCase = components["schemas"]["TestCase"];
export type CommitRef = components["schemas"]["CommitRef"];

/** Typed response bodies for TanStack Query / Express handlers. */
export type DevSiteResponseBody = ExtractResponseBody<operations>;
/** Typed request bodies for TanStack Query / Express handlers. */
export type DevSiteRequestBody = ExtractRequestBody<operations>;
