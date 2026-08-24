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
      SERVICE_SUBDOMAINS: process.env.SERVICE_SUBDOMAINS,
    };

    applySecurityPlaywrightEnv({ domain: "only.domain" });
    expect(process.env.DOMAIN).toBe("only.domain");
    expect(process.env.PROTOCOL).toBe(original.PROTOCOL);

    applySecurityPlaywrightEnv({
      domain: "full.test",
      protocol: "https",
      serviceSubdomains: "api,grpc",
    });
    expect(process.env.DOMAIN).toBe("full.test");
    expect(process.env.PROTOCOL).toBe("https");
    expect(process.env.SERVICE_SUBDOMAINS).toBe("api,grpc");

    applyLocalDevSecurityEnv("base.docker.localhost");
    expect(process.env.DOMAIN).toBe("base.docker.localhost");
    expect(process.env.PROTOCOL).toBe("http");

    applyProductionCanaryEnv("prod.example");
    expect(process.env.DOMAIN).toBe("prod.example");
    expect(process.env.PROTOCOL).toBe("https");

    process.env.DOMAIN = original.DOMAIN;
    process.env.PROTOCOL = original.PROTOCOL;
    process.env.SERVICE_SUBDOMAINS = original.SERVICE_SUBDOMAINS;
  });
});
