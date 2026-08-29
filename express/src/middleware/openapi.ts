import * as OpenApiValidator from "express-openapi-validator";
import type {
  OpenApiRequestHandler,
  OpenApiRequestMetadata,
} from "express-openapi-validator/dist/framework/types.ts";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import type { InternalServerError } from "express-openapi-validator/dist/framework/types.ts";
import { assertOpenApiOperationTags } from "@saflib/openapi";
import { typedEnv } from "@saflib/env";
import multer from "multer";
import { lenientEmailOpenApiFormat } from "./openapi-formats.ts";

declare global {
  namespace Express {
    interface Request {
      openapi?: OpenApiRequestMetadata;
    }
  }
}

type OpenApiValidationIssue = {
  path?: string;
  message?: string;
};

function propertyNameFromIssuePath(path?: string): string | undefined {
  if (!path) {
    return undefined;
  }
  const segments = path.split("/").filter(Boolean);
  return segments.at(-1);
}

function formatOpenApiValidationError(err: InternalServerError): string {
  const issues = (err as InternalServerError & { errors?: OpenApiValidationIssue[] })
    .errors;
  if (!issues?.length) {
    return err.message;
  }

  const formatIssues = issues.filter((issue) =>
    issue.message?.includes("must match format"),
  );

  if (formatIssues.length) {
    return formatIssues
      .map((issue) => {
        const path = issue.path?.replace(/^\/response/, "response") || "value";
        const property = propertyNameFromIssuePath(issue.path);
        const formatMatch = issue.message?.match(/format "([^"]+)"/);
        const formatName = formatMatch?.[1] ?? "unknown";
        const label = property ? `${path} (${property})` : path;
        return `${label}: invalid ${formatName}`;
      })
      .join("; ");
  }

  const additionalPropertyIssues = issues.filter((issue) =>
    issue.message?.includes("additional propert"),
  );

  if (additionalPropertyIssues.length) {
    const byLocation = new Map<string, string[]>();

    for (const issue of additionalPropertyIssues) {
      const property = propertyNameFromIssuePath(issue.path);
      if (!property) {
        continue;
      }
      const location =
        issue.path?.replace(/\/[^/]+$/, "").replace(/^\/response/, "response") ||
        "response";
      const existing = byLocation.get(location) ?? [];
      existing.push(property);
      byLocation.set(location, existing);
    }

    return [...byLocation.entries()]
      .map(
        ([location, properties]) =>
          `${location}: unexpected additional properties [${properties.join(", ")}]`,
      )
      .join("; ");
  }

  const details = issues
    .map((issue) => {
      const path = issue.path?.replace(/^\/response/, "response") || "response";
      return `${path}: ${issue.message ?? "validation failed"}`;
    })
    .join("; ");

  return `${err.message} — ${details}`;
}

const validateResponses = {
  onError: (err: InternalServerError, _json: unknown, _req: unknown) => {
    err.message = formatOpenApiValidationError(err);

    if (
      typedEnv.NODE_ENV === "test" ||
      typedEnv.NODE_ENV === "development"
    ) {
      console.error("====== OpenAPI response validation failed ======");
      console.error(err.message);
      console.error(
        "> Please update the spec or match the implementation to the spec.",
      );
      console.error(
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
  if (typeof spec === "object" && spec !== null) {
    assertOpenApiOperationTags(spec);
  }
  return OpenApiValidator.middleware({
    apiSpec: spec,
    validateRequests: true,
    validateResponses,
    formats: {
      email: {
        type: "string",
        validate: lenientEmailOpenApiFormat.validate,
      },
    },
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
