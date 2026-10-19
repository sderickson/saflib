import type {
  operations as AllOperations,
  components,
  paths,
} from "../../openapi.d.ts";
import { jsonSpec } from "../../json-spec.ts";
import { sliceOperationById } from "@saflib/openapi/slice-operation";
import type {
  ExtractResponseBody,
  ExtractRequestBody,
  ExtractRequestPathParams,
  ExtractRequestQueryParams,
} from "@saflib/openapi";

export const operationId = "listPlans" as const;

export type operations = Pick<AllOperations, typeof operationId>;
export type { components, paths };

/** OpenAPI document for a single operation — use with createScopedMiddleware. */
export const operationJsonSpec = sliceOperationById(jsonSpec, operationId);

export type ResponseBody = ExtractResponseBody<operations>;
export type RequestBody = ExtractRequestBody<operations>;
export type PathParams = ExtractRequestPathParams<operations>;
export type QueryParams = ExtractRequestQueryParams<operations>;
