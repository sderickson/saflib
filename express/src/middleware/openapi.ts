import * as OpenApiValidator from "express-openapi-validator";
import type {
  OpenApiRequestHandler,
  OpenApiRequestMetadata,
} from "express-openapi-validator/dist/framework/types.ts";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import type { InternalServerError } from "express-openapi-validator/dist/framework/types.ts";
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
  onError: (err: InternalServerError, _json: unknown, _req: unknown) => {
    if (typedEnv.NODE_ENV === "test") {
      console.log("======", err.message, "======");
      console.log(
        "> Please update the spec or match the implementation to the spec.",
      );
      console.log(
        "> Also: Don't forget to run `npm exec saf-specs generate` to update your spec.",
      );
    }
    throw err;
  },
};

/** Shared validator stacks per spec — avoids re-compiling AJV on every router mount. */
const validatorCache = new WeakMap<
  OpenAPIV3.DocumentV3,
  Map<string, OpenApiRequestHandler[]>
>();

function fileUploaderCacheKey(fileUploader?: multer.Options): string {
  return fileUploader ? "multer" : "default";
}

function buildOpenApiValidatorMiddleware(
  spec: string | OpenAPIV3.DocumentV3,
  fileUploader?: multer.Options,
): OpenApiRequestHandler[] {
  return OpenApiValidator.middleware({
    apiSpec: spec,
    validateRequests: true,
    validateResponses,
    fileUploader,
  });
}

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
  const spec =
    typeof options.apiSpec === "string"
      ? require(options.apiSpec)
      : options.apiSpec;

  if (typeof spec === "object" && spec !== null) {
    const uploaderKey = fileUploaderCacheKey(options.fileUploader);
    let byUploader = validatorCache.get(spec);
    if (!byUploader) {
      byUploader = new Map();
      validatorCache.set(spec, byUploader);
    }
    const cached = byUploader.get(uploaderKey);
    if (cached) {
      return cached;
    }
    const created = buildOpenApiValidatorMiddleware(spec, options.fileUploader);
    byUploader.set(uploaderKey, created);
    return created;
  }

  return buildOpenApiValidatorMiddleware(spec, options.fileUploader);
};
