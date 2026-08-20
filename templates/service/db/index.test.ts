import { describe, it, expect } from "vitest";
import { templatesDbManager } from "@saflib/templates-db/instances";

describe("@saflib/templates-db", () => {
  it("should be defined", () => {
    expect(templatesDbManager).toBeDefined();
  });
});
