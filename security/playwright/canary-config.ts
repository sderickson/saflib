/**
 * Playwright config factory for production HTTPS canary security checks.
 * @module @saflib/security/playwright/canary-config
 */

import {
  defineConfig,
  type PlaywrightTestConfig,
} from "@playwright/test";
import base from "@saflib/playwright/playwright.config";

export type CreateSecurityCanaryPlaywrightConfigOptions = {
  /** Directory containing `*.spec.ts` security tests. */
  testDir: string;
  /** Extra Playwright config merged last. */
  config?: PlaywrightTestConfig;
};

/**
 * Config for `@canary` tagged specs (transport, secure cookies, marketing headers).
 * Run against production HTTPS with credentials from env (see README).
 */
export function createSecurityCanaryPlaywrightConfig(
  options: CreateSecurityCanaryPlaywrightConfigOptions,
) {
  const projects = (base.projects ?? []).filter(
    (project) => project.name === "server health" || project.name === "chromium",
  );

  return defineConfig({
    ...base,
    testDir: options.testDir,
    grep: /@canary/,
    workers: 1,
    fullyParallel: false,
    projects,
    ...options.config,
  });
}
