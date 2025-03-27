import type { Handler } from "express";
import { json, urlencoded } from "express";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import { auth } from "./auth.ts";
import { corsRouter } from "./cors.ts";
import { errorHandler, notFoundHandler } from "./errors.ts";
import { createHealthHandler, healthRouter } from "./health.ts";
import { httpLogger } from "./httpLogger.ts";
import { loggerInjector } from "./logger.ts";
import { createOpenApiValidator } from "./openapi.ts";
import { requestId } from "./requestId.ts";

/**
 * Recommended pre-route middleware stack.
 * Includes:
 * 1. Request ID generation
 * 2. HTTP request logging (Morgan)
 * 3. Body parsing (JSON + URL-encoded)
 * 4. Logger injection
 * 5. OpenAPI validation
 * 6. Health check endpoint (/health)
 */

export const recommendedPreMiddleware: Handler[] = [
  healthRouter, // before httpLogger to avoid polluting logs
  requestId,
  httpLogger,
  // Built-in Express middleware
  json(),
  urlencoded({ extended: false }),
  loggerInjector,
  corsRouter,
];

interface PreMiddlewareOptions {
  apiSpec?: OpenAPIV3.DocumentV3;
  parseAuthHeaders?: boolean;
  disableCors?: boolean;
  healthCheck?: () => Promise<boolean>;
}

export const createPreMiddleware = (
  options: PreMiddlewareOptions = {}
): Handler[] => {
  const { apiSpec, parseAuthHeaders, disableCors, healthCheck } = options;

  let healthMiddleware: Handler = healthRouter;
  if (healthCheck) {
    healthMiddleware = createHealthHandler(healthCheck);
  }

  let openApiValidatorMiddleware: Handler[] = [];
  if (apiSpec) {
    openApiValidatorMiddleware = createOpenApiValidator(apiSpec);
  }

  let authMiddleware: Handler[] = [];
  if (parseAuthHeaders || apiSpec) {
    authMiddleware = [auth];
  }

  let corsMiddleware: Handler[] = [corsRouter];
  if (disableCors) {
    corsMiddleware = [];
  }

  return [
    healthMiddleware, // before httpLogger to avoid polluting logs
    requestId,
    httpLogger,
    // Built-in Express middleware
    json(),
    urlencoded({ extended: false }),
    loggerInjector,
    ...corsMiddleware,
    ...authMiddleware,
    ...openApiValidatorMiddleware,
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
