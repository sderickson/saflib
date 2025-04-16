// middleware
export { requestId } from "./middleware/requestId.ts";
export { httpLogger } from "./middleware/httpLogger.ts";
export { loggerInjector } from "./middleware/logger.ts";
export { healthRouter, createHealthHandler } from "./middleware/health.ts";
export { auth } from "./middleware/auth.ts";
export { corsRouter } from "./middleware/cors.ts";
export { errorHandler, notFoundHandler } from "./middleware/errors.ts";
export { createScopeValidator } from "./middleware/scopes.ts";
export { generateRequestId } from "./request-id.ts";

// validation
export { createOpenApiValidator } from "./middleware/openapi.ts";

// bash command logic
export { healthcheck } from "./bin/healthcheck.ts";
export { startServer } from "./bin/www.ts";
export { startExpressServer } from "./bin/www.ts";
// consumers of this library automatically get env variables
import dotenv from "dotenv";
dotenv.config();

// Recommended middleware bundles
export {
  recommendedPreMiddleware,
  recommendedErrorHandlers,
  createPreMiddleware,
} from "./middleware/composition.ts";

// route handler utilities
export { createHandler } from "./handler.ts";
