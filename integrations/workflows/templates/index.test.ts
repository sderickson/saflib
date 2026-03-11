import { describe, it, expect } from "vitest";
import { __integrationName__, ping } from "template-integration";

describe("template-integration", () => {
  it("should export the client", () => {
    expect(__integrationName__).toBeDefined();
  });

  it("should ping successfully", async () => {
    const result = await ping();
    expect(result).toBeDefined();
  });
});
