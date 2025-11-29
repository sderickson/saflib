import { describe, expect, it } from "vitest";
import { backupJobs } from "./cron.ts";

describe("backupJobs", () => {
  it("should be defined", () => {
    expect(backupJobs).toBeDefined();
  });
});
