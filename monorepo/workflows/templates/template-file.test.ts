import { describe, it, expect } from "vitest";
import { templateFile } from "./template-file.js";

describe("templateFile", () => {
  it("should return a greeting message", () => {
    const result = templateFile();
    expect(result).toBe("Hello from templateFile!");
  });

  // TODO: Add more tests as needed
  // it("should handle edge cases", () => {
  //   // Test implementation here
  // });
});
