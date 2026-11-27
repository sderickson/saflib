import type { Request } from "express";

/**
 * Paths that skip the early global auth gate (and should match Caddy
 * `@public_monolith`). Keep OpenAPI `no-auth` tags in sync.
 *
 * Note: `/health`, `/csp-violations`, and `/errors/record` skip the early
 * auth gate. `/errors/record` is a development-only route;
 * listing them here keeps the public-surface inventory in one place.
 */
const PUBLIC_POST_PATHS = new Set([
  "/csp-violations",
  "/errors/record",
  "/user-configs/unsubscribe-marketing",
  // Browser product events (anonymous visitors too); rate limited in @saflib/analytics-http.
  "/product-events",
]);

const PUBLIC_GET_PATHS = new Set([
  "/health",
  "/dev/logs",
  "/dev/logs/stream",
  "/email/sent",
  "/admin/metrics/snapshot",
]);

/**
 * Whether the request may reach product routers without a Kratos session.
 * Methods: GET/HEAD for listed GET paths; POST/OPTIONS for listed POST paths.
 */
export function isPublicMonolithRoute(req: Request): boolean {
  const method = req.method.toUpperCase();
  const path = req.path;

  if (
    (method === "GET" || method === "HEAD") &&
    PUBLIC_GET_PATHS.has(path)
  ) {
    return true;
  }

  if (
    (method === "POST" || method === "OPTIONS") &&
    PUBLIC_POST_PATHS.has(path)
  ) {
    return true;
  }

  return false;
}
