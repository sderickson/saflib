// middleware
export { requestId } from "./middleware/requestId.ts";
export { httpLogger } from "./middleware/httpLogger.ts";
export { createLogger, loggerInjector, logger } from "./middleware/logger.ts";
export { healthRouter } from "./middleware/health.ts";
export { auth } from "./middleware/auth.ts";

// validation
export { createOpenApiValidator } from "./middleware/openapi.ts";

// error handling
export { notFoundHandler, errorHandler } from "./middleware/errors.ts";

// bash command logic
export { healthcheck } from "./bin/healthcheck.ts";
export { startServer } from "./bin/www.ts";

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
