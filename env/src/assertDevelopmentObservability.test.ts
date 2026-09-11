import { describe, it, expect, afterEach } from "vitest";
import { assertDevelopmentObservabilityAvailable } from "./assertDevelopmentObservability.ts";

describe("assertDevelopmentObservabilityAvailable", () => {
  const original = process.env.DEPLOYMENT_NAME;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.DEPLOYMENT_NAME;
    } else {
      process.env.DEPLOYMENT_NAME = original;
    }
  });

  it("allows development deployments", () => {
    process.env.DEPLOYMENT_NAME = "development";
    expect(() => assertDevelopmentObservabilityAvailable()).not.toThrow();
  });

  it("throws outside development", () => {
    process.env.DEPLOYMENT_NAME = "production";
    expect(() =>
      assertDevelopmentObservabilityAvailable("Buffered errors"),
    ).toThrow("Buffered errors is only available in development");
  });
});
