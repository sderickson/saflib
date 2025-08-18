/**
 * Packages which implement express servers should import and use this package.
 *
 * @module @saflib/express
 */

// Middleware
export {
  everyRequestLogger,
  unsafeRequestLogger,
} from "./middleware/httpLogger.ts";
export { healthRouter, createHealthHandler } from "./middleware/health.ts";
export { auth } from "./middleware/auth.ts";
export { corsRouter } from "./middleware/cors.ts";
export { errorHandler, notFoundHandler } from "./middleware/errors.ts";
export { createScopeValidator } from "./middleware/scopes.ts";
export { metricsRouter, metricsMiddleware } from "./middleware/metrics.ts";

// validation
export { createOpenApiValidator } from "./middleware/openapi.ts";

// bash command logic
export { healthcheck } from "./bin/healthcheck.ts";
export {
  startServer,
  type StartServerOptions,
  startExpressServer,
} from "./bin/www.ts";

// consumers of this library automatically get env variables
import dotenv from "dotenv";
if (process.env.NODE_ENV !== "test") {
  // hush warning - TODO: better handle env anyway
  dotenv.config();
}

// middleware bundles
export {
  createGlobalMiddleware,
  createErrorMiddleware,
  createScopedMiddleware,
  type ScopedMiddlewareOptions,
  type GlobalMiddlewareOptions,
} from "./middleware/composition.ts";

// route handler utilities
export { createHandler } from "./handler.ts";
