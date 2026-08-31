import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";

/** Bundled OpenAPI document accepted by express-openapi-validator (3.0.x or 3.1.x). */
export type OpenApiDocument =
  | OpenAPIV3.DocumentV3
  | OpenAPIV3.DocumentV3_1;

/**
 * Takes an imported JSON object and casts it to {@link OpenApiDocument} so that
 * express-openapi-validator can validate the JSON against the OpenAPI spec without
 * complaining about a type mismatch.
 */
export const castJson = (json: { default: unknown }): OpenApiDocument => {
  return json.default as OpenApiDocument;
};

/** Cast an inline OpenAPI object (e.g. in tests) to {@link OpenApiDocument}. */
export function asOpenApiDocument(doc: {
  openapi: string;
  info: OpenAPIV3.InfoObject;
  paths?: OpenAPIV3.PathsObject;
  [key: string]: unknown;
}): OpenApiDocument {
  return doc as OpenApiDocument;
}

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
