import { expect, test } from "vitest";
// Assuming exports are in index.ts at the package root
import * as mainExports from "./index.ts";

test("package has exports", () => {
  expect(Object.keys(mainExports).length).toBeGreaterThan(0);
});
