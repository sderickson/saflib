import { expect, test } from "vitest";
import { greet, meaningOfLife } from "../lib/starter.ts";

test("greet function is available and works", () => {
  expect(greet("Tester")).toBe("Hello, Tester!");
});

test("meaningOfLife is available and correct", () => {
  expect(meaningOfLife).toBe(42);
});
