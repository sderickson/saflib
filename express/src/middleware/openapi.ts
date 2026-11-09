import * as OpenApiValidator from "express-openapi-validator";
import type {
  OpenApiRequestHandler,
  OpenApiRequestMetadata,
} from "express-openapi-validator/dist/framework/types.ts";
import type { InternalServerError } from "express-openapi-validator/dist/framework/types.ts";
import {
  assertOpenApiOperationTags,
  type OpenApiDocument,
} from "@saflib/openapi";
import { typedEnv } from "@saflib/env";
import { safReportersStorage } from "@saflib/node";
import type { Request } from "express";
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
  const issues = (
    err as InternalServerError & { errors?: OpenApiValidationIssue[] }
  ).errors;
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
        issue.path
          ?.replace(/\/[^/]+$/, "")
          .replace(/^\/response/, "response") || "response";
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
  onError: (err: InternalServerError, _json: unknown, req: Request) => {
    err.message = formatOpenApiValidationError(err);

    // An error response whose status the spec doesn't list (an unexpected 500,
    // a 422 from a dependency) is still the most useful thing to send. Failing
    // validation here would replace it with Express's bare HTML 500 and lose
    // the cause, so report the mismatch and let the original through.
    if ((req.res?.statusCode ?? 0) >= 400) {
      const store = safReportersStorage.getStore();
      if (store) {
        store.logError(err);
      } else if (typedEnv.NODE_ENV !== "test") {
        console.error(err.message);
      }
      return;
    }

    if (typedEnv.NODE_ENV === "test" || typedEnv.NODE_ENV === "development") {
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

/** Shared validator stacks per spec, so routes that share a document share one validator. */
const validatorCache = new WeakMap<
  OpenApiDocument,
  Map<string, OpenApiRequestHandler[]>
>();

function fileUploaderCacheKey(fileUploader?: multer.Options): string {
  if (!fileUploader) return "default";
  // Distinguish storage backends so routers sharing one apiSpec don't steal
  // each other's multer config (e.g. memoryStorage vs diskStorage).
  const storageName = fileUploader.storage?.constructor?.name ?? "storage";
  const limit = fileUploader.limits?.fileSize ?? "nolimit";
  return `multer:${storageName}:${limit}`;
}

function buildOpenApiValidatorMiddleware(
  spec: string | OpenApiDocument,
  fileUploader?: multer.Options,
): OpenApiRequestHandler[] {
  return OpenApiValidator.middleware({
    apiSpec: spec,
    validateRequests: true,
    validateResponses,
    // `security` is enforced by our own per-operation middleware (security.ts).
    validateSecurity: false,
    formats: {
      email: {
        type: "string",
        validate: lenientEmailOpenApiFormat.validate,
      },
    },
    fileUploader,
  });
}

/**
 * The steps express-openapi-validator's chain has for the options above, in
 * order. Each lazy stand-in carries the same name, so code that finds a step
 * by name (`splitAtMultipart`) works before the real chain exists.
 */
const VALIDATOR_STEP_NAMES = [
  "pathParamsMiddleware",
  "metadataMiddleware",
  "securityMiddleware",
  // Present even without a `fileUploader` (the validator defaults it on).
  "multipartMiddleware",
  "requestMiddleware",
  "responseMiddleware",
];

function namedHandler(
  name: string,
  handler: OpenApiRequestHandler,
): OpenApiRequestHandler {
  Object.defineProperty(handler, "name", { value: name });
  return handler;
}

/**
 * The validator chain, built on the first request instead of at mount.
 * Creating it loads and preprocesses the whole document (and compiles the
 * OpenAPI meta-schema), which for an app with many specs was over half of
 * startup; specs that never see a request now never pay it. The first request
 * per spec pays it instead (tens to a couple hundred ms).
 */
function lazyOpenApiValidatorMiddleware(
  spec: string | OpenApiDocument,
  fileUploader?: multer.Options,
): OpenApiRequestHandler[] {
  if (typeof spec === "object" && spec !== null) {
    // Cheap, and catches untagged operations at boot rather than first use.
    assertOpenApiOperationTags(spec);
  }
  const names = VALIDATOR_STEP_NAMES;
  let chain: OpenApiRequestHandler[] | undefined;
  const realChain = (): OpenApiRequestHandler[] => {
    if (!chain) {
      const built = buildOpenApiValidatorMiddleware(spec, fileUploader);
      const builtNames = built.map((handler) => handler.name);
      if (builtNames.join(",") !== names.join(",")) {
        throw new Error(
          `OpenAPI validator chain changed: expected [${names.join(", ")}], got [${builtNames.join(", ")}]`,
        );
      }
      chain = built;
    }
    return chain;
  };
  return names.map((name, index) =>
    namedHandler(name, (req, res, next) => {
      let handler: OpenApiRequestHandler;
      try {
        handler = realChain()[index];
      } catch (err) {
        next(err);
        return;
      }
      return handler(req, res, next);
    }),
  );
}

export interface OpenApiValidatorOptions {
  apiSpec: string | OpenApiDocument;
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
    const created = lazyOpenApiValidatorMiddleware(spec, options.fileUploader);
    byUploader.set(uploaderKey, created);
    return created;
  }

  return lazyOpenApiValidatorMiddleware(spec, options.fileUploader);
};
