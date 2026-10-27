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
export {
  makeAuthMiddleware,
  drainRequest,
  type AuthMiddlewareOptions,
} from "./middleware/auth.ts";
export { makeCsrfMiddleware } from "./middleware/csrf.ts";
export {
  compileOperationSecurity,
  sessionSecurityResolver,
  SESSION_SCOPE_EMAIL_VERIFIED,
  SESSION_SCOPE_MFA,
  SESSION_SCOPE_SITE_ADMIN,
  type SecurityResolver,
  type SecurityResolvers,
} from "./middleware/security.ts";
export {
  makeRegisterRoute,
  httpRouteFromOperationSpec,
  type RegisterRoute,
  type RegisterRouteOptions,
  type RouteHttpMethod,
} from "./register-route.ts";
export { makeCsrfTokenMiddleware } from "./middleware/csrf-token.ts";
export {
  createChangeEventMiddleware,
  type CreateChangeEventMiddlewareOptions,
} from "./middleware/changeEvent.ts";

// multer options
export * from "./middleware/multer.ts";

// route handler utilities
export { createHandler } from "./handler.ts";

export { createDevLogsRouter } from "@saflib/node-log-http";
export { createDevAnalyticsRouter } from "@saflib/analytics-http";
export {
  makeUserHeaders,
  makeAdminHeaders,
  makeAssertionHeaders,
} from "./vitest-helpers.ts";

export { noStoreCacheControl } from "./middleware/noStore.ts";
export {
  HTML_NOT_ALLOWED_CODE,
  valueContainsDisallowedHtml,
} from "./middleware/blockHtml.ts";

export {
  kratosAdminBaseUrl,
  resolveUserIdByEmail,
  fetchKratosIdentityById,
  resolveEmailFromIdentityId,
} from "./kratos-admin.ts";

export { resolveAuthFromIdentityId } from "./resolveAuthFromIdentityId.ts";

export {
  createProductHttpApp,
  type CreateProductHttpAppOptions,
  type HttpRouterMount,
} from "./app/create-product-http-app.ts";
export { publicRouteMatcher } from "./app/public-routes.ts";
