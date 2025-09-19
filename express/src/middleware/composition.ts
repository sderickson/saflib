import type { Handler } from "express";
import { json, urlencoded } from "express";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import { corsRouter } from "./cors.ts";
import { errorHandler, notFoundHandler } from "./errors.ts";
import { everyRequestLogger, unsafeRequestLogger } from "./httpLogger.ts";
import { createOpenApiValidator } from "./openapi.ts";
import helmet from "helmet";
import { healthRouter } from "./health.ts";
import { makeContextMiddleware } from "./context.ts";
import { blockHtml } from "./blockHtml.ts";
import { createScopeValidator } from "./scopes.ts";
import { metricsMiddleware } from "./metrics.ts";
import { makeAuthMiddleware } from "./auth.ts";

/**
 * Options for creating global middleware.
 */
export interface GlobalMiddlewareOptions {
  disableCors?: boolean;
}

/**
 * Middleware which should be put at the top of the middleware stack, and run
 * for every request.
 */
export const createGlobalMiddleware = (
  options: GlobalMiddlewareOptions = {},
): Handler[] => {
  const { disableCors } = options;

  let corsMiddleware: Handler[] = [corsRouter];
  if (disableCors) {
    corsMiddleware = [];
  }

  let sanitizeMiddleware: Handler[] = [blockHtml];
  return [
    metricsMiddleware,
    helmet(),
    healthRouter,
    everyRequestLogger,
    json(),
    urlencoded({ extended: false }),
    ...sanitizeMiddleware,
    ...corsMiddleware,
  ];
};

/**
 * Options for creating scoped middleware.
 */
export interface ScopedMiddlewareOptions {
  apiSpec?: OpenAPIV3.DocumentV3;
  authRequired?: boolean;
  adminRequired?: boolean;
}

/**
 * Middleware which should only be applied to a subset of routes in an express server.
 * This middleware all depends on the OpenAPI spec for those routes.
 */
export const createScopedMiddleware = (
  options: ScopedMiddlewareOptions,
): Handler[] => {
  const { apiSpec, authRequired, adminRequired } = options;

  let openApiValidatorMiddleware: Handler[] = [];
  if (apiSpec) {
    openApiValidatorMiddleware = createOpenApiValidator(apiSpec);
  }

  let authMiddleware: Handler[] = [];
  if (authRequired !== false) {
    authMiddleware = [makeAuthMiddleware({ adminRequired })];
  }

  return [
    ...openApiValidatorMiddleware,
    makeContextMiddleware(),
    unsafeRequestLogger,
    ...authMiddleware,
    createScopeValidator(),
  ];
};

/**
 * Middleware which should be placed after all routes.
 */
export const createErrorMiddleware = () => {
  return [notFoundHandler, errorHandler];
};
