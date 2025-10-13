import * as OpenApiValidator from "express-openapi-validator";
import type {
  OpenApiRequestHandler,
  OpenApiRequestMetadata,
} from "express-openapi-validator/dist/framework/types.ts";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import type { Request } from "express";
import { typedEnv } from "@saflib/env";
import multer from "multer";

declare global {
  namespace Express {
    interface Request {
      openapi?: OpenApiRequestMetadata;
    }
  }
}

const validateResponses = {
  onError: (err: Error, _json: any, _req: Request) => {
    if (typedEnv.NODE_ENV === "test") {
      console.log("======", err.message, "======");
      console.log(
        "> Please update the spec or match the implementation to the spec.",
      );
      console.log(
        "> Also: Don't forget to run `npm run generate` to update your spec.",
      );
    }
    throw err;
  },
};

export interface OpenApiValidatorOptions {
  apiSpec: string | OpenAPIV3.DocumentV3;
  fileUploader?: multer.Options;
}

/**
 * Creates OpenAPI validation middleware with a custom specification.
 * Only use this if you need to validate against a different OpenAPI spec.
 */
export const createOpenApiValidator = (
  options: OpenApiValidatorOptions,
): OpenApiRequestHandler[] => {
  // Parse spec if it's a string
  const spec =
    typeof options.apiSpec === "string"
      ? require(options.apiSpec)
      : options.apiSpec;

  return [
    // Request/response validation
    ...OpenApiValidator.middleware({
      apiSpec: spec,
      validateRequests: true,
      validateResponses,
      fileUploader: options.fileUploader,
    }),
  ];
};
