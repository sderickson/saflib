import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  apiOrigin,
  apexUrl,
  appOrigin,
  evilOrigin,
  getDomain,
  getProtocol,
  kratosPublicOrigin,
  spaOrigin,
} from "../../origins/urls.ts";

describe("origins", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.PROTOCOL = "https";
    process.env.DOMAIN = "example.test";
  });

  afterEach(() => {
    process.env = { ...env };
  });

  test("reads protocol and domain from env", () => {
    expect(getProtocol()).toBe("https");
    expect(getDomain()).toBe("example.test");
  });

  test("builds subdomain origins", () => {
    expect(apiOrigin()).toBe("https://api.example.test");
    expect(appOrigin()).toBe("https://app.example.test");
    expect(spaOrigin("admin")).toBe("https://admin.example.test");
    expect(kratosPublicOrigin()).toBe("https://kratos.example.test");
    expect(evilOrigin()).toBe("https://evil.localhost");
    expect(apexUrl("/privacy")).toBe("https://example.test/privacy");
  });

  test("defaults when env is unset", () => {
    delete process.env.PROTOCOL;
    delete process.env.DOMAIN;
    expect(getProtocol()).toBe("http");
    expect(getDomain()).toBe("localhost");
    expect(apiOrigin()).toBe("http://api.localhost");
  });
});
