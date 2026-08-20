import { describe, it, expect } from "vitest";
import { baseDbManager } from "@saflib/base-db/instances";

describe("@saflib/base-db", () => {
  it("should be defined", () => {
    expect(baseDbManager).toBeDefined();
  });
});
