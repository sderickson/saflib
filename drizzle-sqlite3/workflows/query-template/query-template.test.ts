import { describe, it, expect } from "vitest";
import { queryTemplate } from "./query-template.js";

describe("queryTemplate", () => {
  it("should execute successfully", async () => {
    const result = await queryTemplate({});
    expect(result.isOk()).toBe(true);
  });
});
