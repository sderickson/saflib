import * as OpenApiValidator from "express-openapi-validator";
import type { OpenApiRequestHandler } from "express-openapi-validator/dist/framework/types.ts";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import type { Request } from "express";
import { createScopeValidator } from "./scopes.ts";

const validateResponses = {
  onError: (err: Error, _json: any, req: Request) => {
    // console.log("Response validation error:", err.message);
    req.log.error(err);
    if (process.env.NODE_ENV === "test") {
      console.log("======", err.message, "======");
      console.log(
        "> Please update the spec or match the implementation to the spec.",
      );
      console.log(
        "> Also: Don't forget to run `npm run generate-specs` to update the spec.",
      );
    }
    throw err;
  },
};

/**
 * Creates OpenAPI validation middleware with a custom specification.
 * Only use this if you need to validate against a different OpenAPI spec.
 */
export const createOpenApiValidator = (
  apiSpec: string | OpenAPIV3.DocumentV3,
): OpenApiRequestHandler[] => {
  // Parse spec if it's a string
  const spec = typeof apiSpec === "string" ? require(apiSpec) : apiSpec;

  return [
    // Request/response validation
    ...OpenApiValidator.middleware({
      apiSpec: spec,
      validateRequests: true,
      validateResponses,
    }),
    // Scope validation
    createScopeValidator(spec),
  ];
};
