import { expect, test } from "vitest";
import * as mainExports from "./index.ts";

test("package has exports", () => {
  expect(Object.keys(mainExports).length).toBeGreaterThan(0);
});
