import { describe, it, expect } from "vitest";
import * as exports from "example-db";

describe("example-db", () => {
  it("should be defined", () => {
    expect(exports).toBeDefined();
  });
});
