import type { ErrorRequestHandler, Handler, RequestHandler } from "express";
import { json, urlencoded } from "express";
import type { OpenApiDocument } from "@saflib/openapi";
import { isDevelopmentDeployment } from "@saflib/env";
import { corsRouter } from "./cors.ts";
import { errorHandler, notFoundHandler } from "./errors.ts";
import { everyRequestLogger, unsafeRequestLogger } from "./httpLogger.ts";
import { createOpenApiValidator } from "./openapi.ts";
import helmet from "helmet";
import { healthRouter } from "./health.ts";
import { createDevLogsRouter } from "@saflib/node-log-http";
import {
  createAnalyticsRouter,
  createDevAnalyticsRouter,
} from "@saflib/analytics-http";
import { createErrorsRouter } from "@saflib/errors-http";
import { makeContextMiddleware } from "./context.ts";
import { blockHtml } from "./blockHtml.ts";
import { metricsMiddleware } from "./metrics.ts";
import { noStoreCacheControl } from "./noStore.ts";
import { makeAuthMiddleware } from "./auth.ts";
import { makeCsrfMiddleware } from "./csrf.ts";
import { makeCsrfTokenMiddleware } from "./csrf-token.ts";
import multer from "multer";

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
  // Logs / in-memory analytics listing stay development-only. Admin error
  // smoke + ring buffer (`/admin/test-error`, `/admin/errors`) are on
  // createErrorsRouter so prod-local / production authz and monitoring checks work.
  const devObservabilityMiddleware: Handler[] = isDevelopmentDeployment()
    ? [createDevLogsRouter(), createDevAnalyticsRouter()]
    : [];
  return [
    ...metricsMiddleware,
    noStoreCacheControl,
    helmet(),
    makeCsrfTokenMiddleware(),
    healthRouter,
    ...devObservabilityMiddleware,
    everyRequestLogger,
    json(jsonLimit ? { limit: jsonLimit } : undefined),
    urlencoded({ extended: false }),
    createAnalyticsRouter(),
    createErrorsRouter(),
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
  } = options;

  let openApiValidatorMiddleware: Handler[] = [];
  if (apiSpec) {
    openApiValidatorMiddleware = createOpenApiValidator({
      apiSpec,
      fileUploader,
    }) as unknown as Handler[];
  }

  let authMiddleware: Handler[] = [];
  if (enforceAuth !== false) {
    authMiddleware = [
      makeAuthMiddleware({
        adminRequired,
        emailVerificationRequired,
        mfaRequired,
      }),
    ];
  }

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
