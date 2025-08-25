import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";

/**
 * Takes an imported JSON object and casts it to the OpenAPIV3.DocumentV3 type so that express-openapi-validator can validate the JSON against the OpenAPI spec without complaining about a type mismatch.
 */
export const castJson = (json: any) => {
  return json.default as OpenAPIV3.DocumentV3;
};

/**
 * Convenience type to lookup the response body by operationId.
 *
 * @example
 * ```typescript
 *
 * // In your spec package
 * import type { operations } from "./dist/openapi.d.ts";
 * export type MyApiResponseBody = ExtractResponseBody<operations>;
 *
 * // In your API route handler
 * const responseBody: MyApiResponseBody["myOperationId"][200] = {
 *   success: true,
 *   message: "Success",
 * };
 * ```
 */
export type ExtractResponseBody<Ops extends Record<string, any>> = {
  [OpKey in keyof Ops]: {
    [StatusCode in keyof Ops[OpKey]["responses"]]: Ops[OpKey]["responses"][StatusCode] extends {
      content: { "application/json": any };
    }
      ? Ops[OpKey]["responses"][StatusCode]["content"]["application/json"]
      : never;
  };
};

/**
 * Convenience type to lookup the request body by operationId.
 *
 * @example
 * ```typescript
 *
 * // In your spec package
 * import type { operations } from "./dist/openapi.d.ts";
 * export type MyApiRequestBody = ExtractRequestBody<operations>;
 *
 * // In your API route handler
 * const requestBody: MyApiRequestBody["myOperationId"] = req.body;
 * ```
 */
export type ExtractRequestBody<Ops extends Record<string, any>> = {
  [OpKey in keyof Ops]: Ops[OpKey]["requestBody"] extends {
    content: { "application/json": any };
  }
    ? Ops[OpKey]["requestBody"]["content"]["application/json"]
    : never;
};

/**
 * Convenience type to lookup the path params by operationId.
 *
 * @example
 * ```typescript
 *
 * // In your spec package
 * import type { operations } from "./dist/openapi.d.ts";
 * export type MyApiPathParams = ExtractRequestPathParams<operations>;
 *
 * // In your API route handler
 * const pathParams: MyApiPathParams["myOperationId"] = req.params;
 * ```
 */
export type ExtractRequestPathParams<Ops extends Record<string, any>> = {
  [OpKey in keyof Ops]: Ops[OpKey]["parameters"]["path"];
};

/**
 * Convenience type to lookup the query params by operationId.
 *
 * @example
 * ```typescript
 *
 * // In your spec package
 * import type { operations } from "./dist/openapi.d.ts";
 * export type MyApiQueryParams = ExtractRequestQueryParams<operations>;
 *
 * // In your API route handler
 * const queryParams: MyApiQueryParams["myOperationId"] = req.query;
 * ```
 */
export type ExtractRequestQueryParams<Ops extends Record<string, any>> = {
  [OpKey in keyof Ops]: Ops[OpKey]["parameters"]["query"];
};
