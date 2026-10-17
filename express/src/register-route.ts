import type { Handler, IRouter, RequestHandler } from "express";
import type { OpenApiDocument } from "@saflib/openapi";
import {
  createScopedMiddleware,
  type ScopedMiddlewareOptions,
} from "./middleware/composition.ts";
import type { SecurityResolvers } from "./middleware/security.ts";

export type RouteHttpMethod = "get" | "post" | "put" | "patch" | "delete";

const HTTP_METHODS = new Set<RouteHttpMethod>([
  "get",
  "post",
  "put",
  "patch",
  "delete",
]);

/**
 * Read the single method + path from a per-operation OpenAPI document
 * (`operationJsonSpec` from `@…-spec/operations/<id>`). OpenAPI `{id}` path
 * params become Express `:id`.
 */
export function httpRouteFromOperationSpec(apiSpec: OpenApiDocument): {
  method: RouteHttpMethod;
  path: string;
} {
  const entries = Object.entries(apiSpec.paths ?? {});
  if (entries.length !== 1) {
    throw new Error(
      `operationJsonSpec must declare exactly one path (got ${entries.length})`,
    );
  }
  const [openApiPath, pathItem] = entries[0]!;
  if (!pathItem || typeof pathItem !== "object") {
    throw new Error(`operationJsonSpec path item missing for ${openApiPath}`);
  }
  const methods = Object.keys(pathItem).filter((k) =>
    HTTP_METHODS.has(k as RouteHttpMethod),
  );
  if (methods.length !== 1) {
    throw new Error(
      `operationJsonSpec path ${openApiPath} must declare exactly one HTTP method (got ${methods.join(", ") || "none"})`,
    );
  }
  return {
    method: methods[0] as RouteHttpMethod,
    path: openApiPath.replace(/\{([^}/]+)\}/g, ":$1"),
  };
}

export type RegisterRouteOptions = Omit<
  ScopedMiddlewareOptions,
  "apiSpec" | "securityResolvers"
> & {
  /**
   * Route-level middleware that must run before validation (e.g. copying a
   * path param into a header). Has access to `req.params`, not `req.openapi`.
   */
  before?: Handler[];
  /** Middleware after validation + security, before the handler. */
  after?: Handler[];
};

export type RegisterRoute = (
  router: IRouter,
  apiSpec: OpenApiDocument,
  handler: RequestHandler,
  options?: RegisterRouteOptions,
) => void;

/**
 * Build a product's `registerRoute`, binding its OpenAPI security resolvers
 * once. Each call mounts one operation at the method + path from its spec:
 * `before` → OpenAPI validation, CSRF, context, security → `after` → handler.
 */
export function makeRegisterRoute(
  config: { securityResolvers?: SecurityResolvers } = {},
): RegisterRoute {
  return (router, apiSpec, handler, options = {}) => {
    const { before = [], after = [], ...scopedOptions } = options;
    const { method, path } = httpRouteFromOperationSpec(apiSpec);
    router[method](
      path,
      ...before,
      ...createScopedMiddleware({
        apiSpec,
        securityResolvers: config.securityResolvers,
        ...scopedOptions,
      }),
      ...after,
      handler,
    );
  };
}
