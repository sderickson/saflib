/**
 * Playwright config factory for product security regression suites.
 * @module @saflib/security/playwright/config
 */

import {
  defineConfig,
  type PlaywrightTestConfig,
} from "@playwright/test";
import base from "@saflib/playwright/playwright.config";

export type CreateSecurityPlaywrightConfigOptions = {
  /** Directory containing `*.spec.ts` security tests. Defaults to `./`. */
  testDir?: string;
  /** When true (default), skip `@canary` specs (production HTTPS checks). */
  excludeCanary?: boolean;
  /** Extra Playwright config merged last. */
  config?: PlaywrightTestConfig;
};

/**
 * Default config for prod-local docker compose security suites.
 *
 * - Chromium only (HTTP-level checks; no cross-browser matrix)
 * - Serial workers (shared bootstrap accounts)
 * - Excludes `@canary` specs — use {@link createSecurityCanaryPlaywrightConfig} for those
 */
export function createSecurityPlaywrightConfig(
  options: CreateSecurityPlaywrightConfigOptions = {},
) {
  const projects = (base.projects ?? []).filter(
    (project) => project.name === "server health" || project.name === "chromium",
  );

  const excludeCanary = options.excludeCanary !== false;

  return defineConfig({
    ...base,
    testDir: options.testDir ?? "./.",
    projects,
    workers: 1,
    fullyParallel: false,
    timeout: 120_000,
    grepInvert: excludeCanary ? /@canary/ : undefined,
    ...options.config,
  });
}
