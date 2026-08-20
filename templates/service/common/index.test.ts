import { describe, it, expect } from "vitest";
import { templatesServiceStorage } from "@saflib/templates-service-common/context";

describe("@saflib/templates-service-common", () => {
  it("should be defined", () => {
    expect(templatesServiceStorage).toBeDefined();
  });
});
