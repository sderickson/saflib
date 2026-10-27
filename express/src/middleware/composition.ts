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
 * express-openapi-validator's chain runs multer in a step with this name, after
 * route matching (`req.openapi`) and before request validation.
 */
const MULTIPART_STEP = "multipartMiddleware";

/**
 * Split the validator chain at its multipart step so access checks can run
 * between route matching and body parsing. Throws at mount time if the step
 * is missing (e.g. a validator upgrade renamed it), rather than silently
 * parsing uploads before auth again.
 */
export function splitAtMultipart(chain: Handler[]): [Handler[], Handler[]] {
  const index = chain.findIndex((handler) => handler.name === MULTIPART_STEP);
  if (index === -1) {
    throw new Error(
      `createScopedMiddleware: OpenAPI validator has no "${MULTIPART_STEP}" step; cannot check access before parsing uploads`,
    );
  }
  return [chain.slice(0, index), chain.slice(index)];
}

/**
 * Middleware which should only be applied to a subset of routes in an express server.
 * This middleware all depends on the OpenAPI spec for those routes.
 *
 * With `fileUploader`, CSRF, context, and security run before multer parses
 * the body, so a rejected request never writes its upload to disk.
 */
export const createScopedMiddleware = (
  options: ScopedMiddlewareOptions,
): Handler[] => {
  const { apiSpec, fileUploader, securityResolvers } = options;

  const openApiValidatorMiddleware = createOpenApiValidator({
    apiSpec,
    fileUploader,
  }) as unknown as Handler[];

  const accessChecks: Handler[] = [
    // CSRF reads `x-public` and the `csrf-exempt` tag from `req.openapi.schema`.
    makeCsrfMiddleware(),
    makeContextMiddleware(),
    unsafeRequestLogger,
    ...compileOperationSecurity(apiSpec, securityResolvers),
  ];

  if (fileUploader) {
    const [matchRoute, parseAndValidate] = splitAtMultipart(
      openApiValidatorMiddleware,
    );
    return [
      cleanupUploadedFiles,
      ...matchRoute,
      ...accessChecks,
      ...parseAndValidate,
      makeBlockHtmlMiddleware(),
    ];
  }

  return [
    ...openApiValidatorMiddleware,
    makeBlockHtmlMiddleware(),
    ...accessChecks,
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
