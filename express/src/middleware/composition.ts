import type { Handler } from "express";
import { json, urlencoded } from "express";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import { auth } from "./auth.ts";
import { corsRouter } from "./cors.ts";
import { errorHandler, notFoundHandler } from "./errors.ts";
import { createHealthHandler, healthRouter } from "./health.ts";
import { everyRequestLogger, unsafeRequestLogger } from "./httpLogger.ts";
import { createOpenApiValidator } from "./openapi.ts";
import helmet from "helmet";
import { makeContextMiddleware } from "./context.ts";
import { blockHtml } from "./blockHtml.ts";
import { createScopeValidator } from "./scopes.ts";

export interface PreMiddlewareOptions {
  apiSpec?: OpenAPIV3.DocumentV3;
  authRequired?: boolean;
  disableCors?: boolean;
  healthCheck?: () => Promise<boolean>;
}

export const createPreMiddleware = (
  options: PreMiddlewareOptions,
): Handler[] => {
  const { apiSpec, authRequired, disableCors, healthCheck } = options;

  let healthMiddleware: Handler = healthRouter;
  if (healthCheck) {
    healthMiddleware = createHealthHandler(healthCheck);
  }

  let openApiValidatorMiddleware: Handler[] = [];
  if (apiSpec) {
    openApiValidatorMiddleware = createOpenApiValidator(apiSpec);
  }

  let authMiddleware: Handler[] = [];
  if (authRequired !== false) {
    authMiddleware = [auth];
  }

  let corsMiddleware: Handler[] = [corsRouter];
  if (disableCors) {
    corsMiddleware = [];
  }

  let sanitizeMiddleware: Handler[] = [blockHtml];

  return [
    helmet(),
    healthMiddleware, // before httpLogger to avoid polluting logs
    everyRequestLogger,
    json(),
    urlencoded({ extended: false }),
    ...sanitizeMiddleware,
    ...corsMiddleware,
    ...openApiValidatorMiddleware,
    makeContextMiddleware(),
    unsafeRequestLogger,
    ...authMiddleware,
    createScopeValidator(),
  ];
};

/**
 * Recommended error handling middleware stack.
 * Should be used after all routes.
 * Includes:
 * 1. 404 handler for undefined routes
 * 2. Error handler for all other errors
 */
export const recommendedErrorHandlers = [notFoundHandler, errorHandler];
