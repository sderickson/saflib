import type { Handler } from "express";
import { json, urlencoded } from "express";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import { auth } from "./auth.ts";
import { corsRouter } from "./cors.ts";
import { errorHandler, notFoundHandler } from "./errors.ts";
import { everyRequestLogger, unsafeRequestLogger } from "./httpLogger.ts";
import { createOpenApiValidator } from "./openapi.ts";
import helmet from "helmet";
import { makeContextMiddleware } from "./context.ts";
import { blockHtml } from "./blockHtml.ts";
import { createScopeValidator } from "./scopes.ts";

/**
 * Options for creating global middleware.
 */

export interface GlobalMiddlewareOptions {
  disableCors?: boolean;
}

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
    helmet(),
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
}

export const createScopedMiddleware = (
  options: ScopedMiddlewareOptions,
): Handler[] => {
  const { apiSpec, authRequired } = options;

  let openApiValidatorMiddleware: Handler[] = [];
  if (apiSpec) {
    openApiValidatorMiddleware = createOpenApiValidator(apiSpec);
  }

  let authMiddleware: Handler[] = [];
  if (authRequired !== false) {
    authMiddleware = [auth];
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
 * Creates a middleware stack for error handling.
 */
export const createErrorMiddleware = () => {
  return [notFoundHandler, errorHandler];
};

/**
 * Recommended error handling middleware stack.
 * Should be used after all routes.
 * Includes:
 * 1. 404 handler for undefined routes
 * 2. Error handler for all other errors
 */
// export const errorMiddleware = [notFoundHandler, errorHandler];
