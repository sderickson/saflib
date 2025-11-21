import { describe, expect, it } from "vitest";
import { runBackupCron } from "./cron.ts";

describe("runBackupCron", () => {
  it("should be defined", () => {
    expect(runBackupCron).toBeDefined();
  });
});
