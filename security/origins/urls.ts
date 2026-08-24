/**
 * Origin URL helpers for security Playwright suites.
 * @module @saflib/security/origins/urls
 */

/** Protocol from `PROTOCOL` env (default `http`). */
export function getProtocol(): string {
  return process.env.PROTOCOL ?? "http";
}

/** Product domain from `DOMAIN` env (default `localhost`). */
export function getDomain(): string {
  return process.env.DOMAIN ?? "localhost";
}

/** API host origin, e.g. `http://api.example.docker.localhost`. */
export function apiOrigin(apiSubdomain = "api"): string {
  return `${getProtocol()}://${apiSubdomain}.${getDomain()}`;
}

/** SPA subdomain origin, e.g. `http://app.example.docker.localhost`. */
export function spaOrigin(subdomain: string): string {
  return `${getProtocol()}://${subdomain}.${getDomain()}`;
}

/** App SPA origin (`app.{DOMAIN}`). */
export function appOrigin(): string {
  return spaOrigin("app");
}

/**
 * Deliberately not under the product domain — stays off the prod cookie/eTLD+1
 * surface for cross-origin probes (CORS, CSRF leakage, etc.).
 */
export function evilOrigin(): string {
  return `${getProtocol()}://evil.localhost`;
}

/** Kratos public UI origin (`kratos.{DOMAIN}`). */
export function kratosPublicOrigin(): string {
  return spaOrigin("kratos");
}

/** Apex/marketing URL on the product domain. */
export function apexUrl(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getProtocol()}://${getDomain()}${normalized}`;
}
