import { expect, test } from "vitest";
// Assuming exports are in index.ts at the package root
import * as mainExports from "./index.ts";

test("package has exports", () => {
  expect(Object.keys(mainExports).length).toBeGreaterThan(0);
});

test("greet function is available and works", () => {
  expect(mainExports.greet).toBeDefined();
  expect(mainExports.greet("Tester")).toBe("Hello, Tester!");
});

test("meaningOfLife is available and correct", () => {
  expect(mainExports.meaningOfLife).toBeDefined();
  expect(mainExports.meaningOfLife).toBe(42);
});
