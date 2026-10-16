import type { ErrorRequestHandler, Handler, RequestHandler } from "express";
import { json, urlencoded } from "express";
import type { OpenApiDocument } from "@saflib/openapi";
import { corsRouter } from "./cors.ts";
import { errorHandler, notFoundHandler } from "./errors.ts";
import { everyRequestLogger, unsafeRequestLogger } from "./httpLogger.ts";
import { createOpenApiValidator } from "./openapi.ts";
import helmet from "helmet";
import { healthRouter } from "./health.ts";
import { makeContextMiddleware } from "./context.ts";
import { blockHtml } from "./blockHtml.ts";
import { metricsMiddleware } from "./metrics.ts";
import { noStoreCacheControl } from "./noStore.ts";
import { makeAuthMiddleware } from "./auth.ts";
import { makeCsrfMiddleware } from "./csrf.ts";
import { makeCsrfTokenMiddleware } from "./csrf-token.ts";
import multer from "multer";
import { compileOperationSecurity, type SecurityResolvers } from "./security.ts";

/**
 * Options for creating global middleware.
 */
export interface GlobalMiddlewareOptions {
  disableCors?: boolean;
  /**
   * Max size for JSON request body (e.g. '100kb', '2mb').
   * Default is Express's 100kb when not set.
   */
  jsonLimit?: string;
}

/**
 * Middleware for internal-only service endpoints.
 */
export const createInternalMiddleware = (
  options: Pick<GlobalMiddlewareOptions, "jsonLimit"> = {},
): Handler[] => {
  const { jsonLimit } = options;
  return [
    ...metricsMiddleware,
    noStoreCacheControl,
    everyRequestLogger,
    json(
      jsonLimit
        ? { limit: jsonLimit, strict: false }
        : { strict: false },
    ),
  ];
};

/**
 * Middleware which should be put at the top of the middleware stack, and run
 * for every request.
 */
export const createGlobalMiddleware = (
  options: GlobalMiddlewareOptions = {},
): Handler[] => {
  const { disableCors, jsonLimit } = options;

  let corsMiddleware: Handler[] = [corsRouter];
  if (disableCors) {
    corsMiddleware = [];
  }

  let sanitizeMiddleware: Handler[] = [blockHtml];
  return [
    ...metricsMiddleware,
    noStoreCacheControl,
    helmet(),
    makeCsrfTokenMiddleware(),
    healthRouter,
    everyRequestLogger,
    json(jsonLimit ? { limit: jsonLimit } : undefined),
    urlencoded({ extended: false }),
    ...sanitizeMiddleware,
    ...corsMiddleware,
  ];
};

/**
 * Options for creating scoped middleware.
 */
export interface ScopedMiddlewareOptions {
  apiSpec?: OpenApiDocument;
  fileUploader?: multer.Options;
  enforceAuth?: boolean;
  adminRequired?: boolean;
  emailVerificationRequired?: boolean;
  /** When true, require an MFA session (AAL2+), same as the `mfa-required` OpenAPI tag. */
  mfaRequired?: boolean;
  /**
   * Product security schemes (`session` is built in). Used when the operation
   * declares OpenAPI `security`; then the auth options above must be unset.
   */
  securityResolvers?: SecurityResolvers;
}

/**
 * Scoped middleware for a single OpenAPI operation fragment (from `@<org>/<spec>/operations/<operationId>`).
 */
export const createOperationScopedMiddleware = (
  apiSpec: OpenApiDocument,
  options: Omit<ScopedMiddlewareOptions, "apiSpec"> = {},
): Handler[] => createScopedMiddleware({ ...options, apiSpec });

/**
 * Middleware which should only be applied to a subset of routes in an express server.
 * This middleware all depends on the OpenAPI spec for those routes.
 */
export const createScopedMiddleware = (
  options: ScopedMiddlewareOptions,
): Handler[] => {
  const {
    apiSpec,
    fileUploader,
    enforceAuth,
    adminRequired,
    emailVerificationRequired,
    mfaRequired,
    securityResolvers,
  } = options;

  let openApiValidatorMiddleware: Handler[] = [];
  if (apiSpec) {
    openApiValidatorMiddleware = createOpenApiValidator({
      apiSpec,
      fileUploader,
    }) as unknown as Handler[];
  }

  const hasLegacyAuthOptions =
    enforceAuth !== undefined ||
    adminRequired !== undefined ||
    emailVerificationRequired !== undefined ||
    mfaRequired !== undefined;

  let legacyAuthMiddleware: Handler[] = [];
  if (enforceAuth !== false) {
    legacyAuthMiddleware = [
      makeAuthMiddleware({
        adminRequired,
        emailVerificationRequired,
        mfaRequired,
      }),
    ];
  }

  // OpenAPI `security` replaces tag/option-based auth for operations that declare it.
  const securityMiddleware = apiSpec
    ? compileOperationSecurity(apiSpec, securityResolvers, legacyAuthMiddleware)
    : undefined;
  const singleOperation =
    apiSpec !== undefined &&
    Object.values(apiSpec.paths ?? {}).reduce(
      (n, item) =>
        n +
        Object.keys(item ?? {}).filter((k) =>
          ["get", "post", "put", "patch", "delete"].includes(k),
        ).length,
      0,
    ) === 1;
  if (securityMiddleware && singleOperation && hasLegacyAuthOptions) {
    throw new Error(
      "Operation declares OpenAPI security; remove enforceAuth/adminRequired/emailVerificationRequired/mfaRequired options",
    );
  }
  const authMiddleware = securityMiddleware ?? legacyAuthMiddleware;

  return [
    ...openApiValidatorMiddleware,
    // CSRF reads OpenAPI tags (`no-auth`, `csrf-exempt`); only mount when a
    // validator will attach `req.openapi.schema` on this chain.
    ...(apiSpec ? [makeCsrfMiddleware()] : []),
    makeContextMiddleware(),
    unsafeRequestLogger,
    ...authMiddleware,
  ];
};

/**
 * Middleware which should be placed after all routes.
 */
export const createErrorMiddleware = (): Array<
  RequestHandler | ErrorRequestHandler
> => {
  return [notFoundHandler, errorHandler];
};
