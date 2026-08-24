import { describe, expect, test } from "vitest";
import { createSecurityPlaywrightConfig } from "../../playwright/config.ts";
import { createSecurityCanaryPlaywrightConfig } from "../../playwright/canary-config.ts";

describe("createSecurityPlaywrightConfig", () => {
  test("defaults for prod-local docker compose suites", () => {
    const config = createSecurityPlaywrightConfig();
    expect(config.workers).toBe(1);
    expect(config.fullyParallel).toBe(false);
    expect(config.timeout).toBe(120_000);
    expect(config.grepInvert).toEqual(/@canary/);
    expect(config.projects?.map((project) => project.name)).toEqual([
      "server health",
      "chromium",
    ]);
  });

  test("includes canary specs when excludeCanary is false", () => {
    const config = createSecurityPlaywrightConfig({ excludeCanary: false });
    expect(config.grepInvert).toBeUndefined();
  });

  test("merges extra config last", () => {
    const config = createSecurityPlaywrightConfig({
      testDir: "./specs",
      config: { retries: 3 },
    });
    expect(config.testDir).toBe("./specs");
    expect(config.retries).toBe(3);
  });
});

describe("createSecurityCanaryPlaywrightConfig", () => {
  test("runs only @canary specs serially in chromium", () => {
    const config = createSecurityCanaryPlaywrightConfig({
      testDir: "/tmp/security",
    });
    expect(config.testDir).toBe("/tmp/security");
    expect(config.grep).toEqual(/@canary/);
    expect(config.workers).toBe(1);
    expect(config.fullyParallel).toBe(false);
    expect(config.projects?.map((project) => project.name)).toEqual([
      "server health",
      "chromium",
    ]);
  });
});
