import type { Express, Router } from "express";
import {
  createProductHttpApp,
  type CreateProductHttpAppOptions,
} from "../app/create-product-http-app.ts";

export interface RouteTestAppOptions extends Partial<
  Omit<CreateProductHttpAppOptions, "mounts">
> {
  /** The routers under test; nothing else from the product is mounted. */
  routers: Array<() => Router>;
}

/**
 * An app that mounts only the routers a test passes, behind the same shell as
 * production ({@link createProductHttpApp}), so a feature http package tests
 * itself without the rest of the product. Products wrap this with their
 * service context (`runInContext`) and security resolvers.
 */
export function createRouteTestApp(options: RouteTestAppOptions): Express {
  const { routers, ...rest } = options;
  return createProductHttpApp({
    isPublicRoute: () => false,
    ...rest,
    mounts: routers.map((createRouter) => ({ kind: "router", createRouter })),
  });
}
