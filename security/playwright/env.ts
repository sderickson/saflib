/**
 * Environment defaults for product security Playwright suites.
 * @module @saflib/security/playwright/env
 */

export type SecurityPlaywrightEnvOptions = {
  domain?: string;
  protocol?: "http" | "https";
  /** Comma-separated service subdomains (e.g. `api`). */
  serviceSubdomains?: string;
};

/**
 * Set `DOMAIN`, `PROTOCOL`, and `SERVICE_SUBDOMAINS` for security specs.
 * Only assigns keys that are provided — existing env values are left unchanged.
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
  if (options.serviceSubdomains !== undefined) {
    process.env.SERVICE_SUBDOMAINS = options.serviceSubdomains;
  }
}

/** Prod-local docker compose stack (HTTP, single API subdomain). */
export function applyLocalDevSecurityEnv(domain: string): void {
  applySecurityPlaywrightEnv({
    domain,
    protocol: "http",
    serviceSubdomains: "api",
  });
}

/** Production HTTPS canary checks (`@canary` tagged specs). */
export function applyProductionCanaryEnv(domain: string): void {
  applySecurityPlaywrightEnv({
    domain,
    protocol: "https",
    serviceSubdomains: "api",
  });
}
