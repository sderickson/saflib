import { describe, it, expect } from "vitest";
import { __targetName__ } from "./__target-name__.ts";

describe("__targetName__", () => {
  it("should return a greeting message", () => {
    const result = __targetName__();
    expect(result).toBe("Hello from __targetName__!");
  });
});
