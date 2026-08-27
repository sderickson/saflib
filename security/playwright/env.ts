/**
 * Environment defaults for product security Playwright suites.
 * @module @saflib/security/playwright/env
 */

export type SecurityPlaywrightEnvOptions = {
  domain?: string;
  protocol?: "http" | "https";
};

/**
 * Set `DOMAIN` and `PROTOCOL` for security specs.
 * Only assigns keys that are provided — existing env values are left unchanged.
 * Service health checks use a hardcoded `api` subdomain in `@saflib/playwright`.
 */
export function applySecurityPlaywrightEnv(
  options: SecurityPlaywrightEnvOptions = {},
): void {
  if (options.domain !== undefined) {
    process.env.DOMAIN = options.domain;
  }
  if (options.protocol !== undefined) {
    process.env.PROTOCOL = options.protocol;
  }
}

/** Prod-local docker compose stack (HTTP). */
export function applyLocalDevSecurityEnv(domain: string): void {
  applySecurityPlaywrightEnv({
    domain,
    protocol: "http",
  });
}

/** Production HTTPS canary checks (`@canary` tagged specs). */
export function applyProductionCanaryEnv(domain: string): void {
  applySecurityPlaywrightEnv({
    domain,
    protocol: "https",
  });
}
