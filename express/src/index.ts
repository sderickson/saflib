/**
 * Packages which implement express servers should import and use this package.
 *
 * @module @saflib/express
 */

export { startExpressServer, type StartServerOptions } from "./bin/www.ts";

// middleware bundles
export {
  createGlobalMiddleware,
  createErrorMiddleware,
  createScopedMiddleware,
  type ScopedMiddlewareOptions,
  type GlobalMiddlewareOptions,
} from "./middleware/composition.ts";
export { makeContextMiddleware } from "./middleware/context.ts";
export { makeAuthMiddleware } from "./middleware/auth.ts";

// multer options
export * from "./middleware/multer.ts";

// route handler utilities
export { createHandler } from "./handler.ts";

export { makeUserHeaders, makeAdminHeaders } from "./vitest-helpers.ts";
