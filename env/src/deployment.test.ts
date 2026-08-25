import { describe, it, expect, afterEach } from "vitest";
import { isDevelopmentDeployment } from "./deployment.ts";

describe("isDevelopmentDeployment", () => {
  const original = process.env.DEPLOYMENT_NAME;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.DEPLOYMENT_NAME;
    } else {
      process.env.DEPLOYMENT_NAME = original;
    }
  });

  it("returns true when DEPLOYMENT_NAME is development", () => {
    expect(isDevelopmentDeployment("development")).toBe(true);
  });

  it("returns false for other deployment names", () => {
    expect(isDevelopmentDeployment("production")).toBe(false);
    expect(isDevelopmentDeployment("staging")).toBe(false);
    expect(isDevelopmentDeployment(undefined)).toBe(false);
  });
});
