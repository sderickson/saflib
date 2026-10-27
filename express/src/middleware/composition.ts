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
import { makeBlockHtmlMiddleware } from "./blockHtml.ts";
import { metricsMiddleware } from "./metrics.ts";
import { noStoreCacheControl } from "./noStore.ts";
import { makeCsrfMiddleware } from "./csrf.ts";
import { makeCsrfTokenMiddleware } from "./csrf-token.ts";
import multer from "multer";
import { cleanupUploadedFiles } from "./multer.ts";
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

  return [
    ...metricsMiddleware,
    noStoreCacheControl,
    helmet(),
    makeCsrfTokenMiddleware(),
    healthRouter,
    everyRequestLogger,
    json(jsonLimit ? { limit: jsonLimit } : undefined),
    urlencoded({ extended: false }),
    ...corsMiddleware,
  ];
};

/**
 * Options for creating scoped middleware.
 */
export interface ScopedMiddlewareOptions {
  /**
   * The operation(s) served. Access comes from each operation's OpenAPI
   * `security` (or `x-public: true`); there are no code-side auth options.
   */
  apiSpec: OpenApiDocument;
  fileUploader?: multer.Options;
  /** Product security schemes (`session` is built in). */
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
  const { apiSpec, fileUploader, securityResolvers } = options;

  const openApiValidatorMiddleware = createOpenApiValidator({
    apiSpec,
    fileUploader,
  }) as unknown as Handler[];

  return [
    ...(fileUploader ? [cleanupUploadedFiles] : []),
    ...openApiValidatorMiddleware,
    makeBlockHtmlMiddleware(),
    // CSRF reads `x-public` and the `csrf-exempt` tag from `req.openapi.schema`.
    makeCsrfMiddleware(),
    makeContextMiddleware(),
    unsafeRequestLogger,
    ...compileOperationSecurity(apiSpec, securityResolvers),
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
