import { describe, it, expect } from "vitest";
import * as exports from "template-integration";

describe("template-integration", () => {
  it("should export the client", () => {
    expect(exports.__integrationName__).toBeDefined();
  });
});
