import { describe, it, expect } from "vitest";
import {
  get__IntegrationName__Client,
  isMocked,
  ping,
} from "@saflib/base-__integration-name__-integration";

describe("@saflib/base-__integration-name__-integration", () => {
  it("should export isMocked and get__IntegrationName__Client", () => {
    expect(typeof isMocked).toBe("function");
    expect(typeof get__IntegrationName__Client).toBe("function");
  });

  it("should ping successfully", async () => {
    const result = await ping();
    expect(result).toBeDefined();
  });
});
