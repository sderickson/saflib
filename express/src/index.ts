/**
 * Packages which implement express servers should import and use this package.
 *
 * @module @saflib/express
 */

export {
  startExpressServer,
  type StartServerOptions,
  type StartedExpressServer,
} from "./bin/www.ts";

export { markInternal, isInternalRequest } from "./markInternal.ts";

export {
  createInternalCaller,
  type CreateInternalCallerOptions,
  type InternalCallerRequest,
  type InternalCaller,
} from "./createInternalCaller.ts";

// middleware bundles
export {
  createGlobalMiddleware,
  createInternalMiddleware,
  createErrorMiddleware,
  createScopedMiddleware,
  createOperationScopedMiddleware,
  type ScopedMiddlewareOptions,
  type GlobalMiddlewareOptions,
} from "./middleware/composition.ts";
export { makeContextMiddleware } from "./middleware/context.ts";
export { makeAuthMiddleware, drainRequest, type AuthMiddlewareOptions } from "./middleware/auth.ts";
export { makeCsrfMiddleware } from "./middleware/csrf.ts";
export { makeCsrfTokenMiddleware } from "./middleware/csrf-token.ts";
export {
  createChangeEventMiddleware,
  type CreateChangeEventMiddlewareOptions,
} from "./middleware/changeEvent.ts";

// multer options
export * from "./middleware/multer.ts";

// route handler utilities
export { createHandler } from "./handler.ts";

export {
  makeUserHeaders,
  makeAdminHeaders,
  makeAssertionHeaders,
} from "./vitest-helpers.ts";

export { noStoreCacheControl } from "./middleware/noStore.ts";
