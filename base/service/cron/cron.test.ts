import { describe, expect, it } from "vitest";
import { runBaseCron } from "./cron.ts";

describe("runBaseCron", () => {
  it("should be defined", () => {
    expect(runBaseCron).toBeDefined();
  });
});
