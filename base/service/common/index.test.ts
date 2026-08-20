import { describe, it, expect } from "vitest";
import { baseServiceStorage } from "@saflib/base-service-common/context";

describe("@saflib/base-service-common", () => {
  it("should be defined", () => {
    expect(baseServiceStorage).toBeDefined();
  });
});
