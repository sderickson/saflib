import { describe, it, expect } from "vitest";
import { __serviceName__ServiceStorage } from "template-package-service-common/context";

describe("template-package-service-common", () => {
  it("should be defined", () => {
    expect(__serviceName__ServiceStorage).toBeDefined();
  });
});
