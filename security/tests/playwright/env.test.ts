import { describe, expect, test } from "vitest";
import {
  applyLocalDevSecurityEnv,
  applyProductionCanaryEnv,
  applySecurityPlaywrightEnv,
} from "../../playwright/env.ts";

describe("playwright-env", () => {
  test("applySecurityPlaywrightEnv sets provided keys only", () => {
    const original = {
      DOMAIN: process.env.DOMAIN,
      PROTOCOL: process.env.PROTOCOL,
    };

    applySecurityPlaywrightEnv({ domain: "only.domain" });
    expect(process.env.DOMAIN).toBe("only.domain");
    expect(process.env.PROTOCOL).toBe(original.PROTOCOL);

    applySecurityPlaywrightEnv({
      domain: "full.test",
      protocol: "https",
    });
    expect(process.env.DOMAIN).toBe("full.test");
    expect(process.env.PROTOCOL).toBe("https");

    applyLocalDevSecurityEnv("base.docker.localhost");
    expect(process.env.DOMAIN).toBe("base.docker.localhost");
    expect(process.env.PROTOCOL).toBe("http");

    applyProductionCanaryEnv("prod.example");
    expect(process.env.DOMAIN).toBe("prod.example");
    expect(process.env.PROTOCOL).toBe("https");

    process.env.DOMAIN = original.DOMAIN;
    process.env.PROTOCOL = original.PROTOCOL;
  });
});
