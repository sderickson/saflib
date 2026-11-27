import { describe, it, expect } from "vitest";
import { isIgnoredClientError } from "./record-reported-error.ts";

describe("isIgnoredClientError", () => {
  it("drops failed dynamic imports in development only", () => {
    const firefox = "error loading dynamically imported module: http://x/node_modules/.vite/deps/a.js";
    const chrome = "Failed to fetch dynamically imported module: http://x/assets/b.js";
    const safari = "Importing a module script failed.";
    for (const m of [firefox, chrome, safari]) {
      expect(isIgnoredClientError(m, true)).toBe(true);
      expect(isIgnoredClientError(m, false)).toBe(false);
    }
    expect(isIgnoredClientError("Cannot read properties of undefined", true)).toBe(false);
  });
});
