import { describe, it, expect } from "vitest";
import { __serviceName__DbManager } from "template-package-db/instances";

describe("template-package-db", () => {
  it("should be defined", () => {
    expect(__serviceName__DbManager).toBeDefined();
  });
});
