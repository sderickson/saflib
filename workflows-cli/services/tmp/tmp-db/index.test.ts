import { describe, it, expect } from "vitest";
import * as exports from "tmp-db";

describe("tmp-db", () => {
  it("should be defined", () => {
    expect(exports).toBeDefined();
  });
});
