/**
 * Packages which implement express servers should import and use this package.
 *
 * @module @saflib/express
 */

export { startExpressServer, type StartServerOptions } from "./bin/www.ts";

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

export { makeUserHeaders } from "./vitest-helpers.ts";
