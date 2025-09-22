import { describe, it, expect } from "vitest";
import * as exports from "__shared-package-prefix__-db";

describe("__shared-package-prefix__-db", () => {
  it("should be defined", () => {
    expect(exports).toBeDefined();
  });
});
