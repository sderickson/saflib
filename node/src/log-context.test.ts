import { describe, expect, it } from "vitest";
import { logContextOf } from "./logger.ts";

describe("logContextOf", () => {
  it("prefers the job, then cron tick, startup, then request", () => {
    expect(logContextOf({ subsystemName: "http", requestId: "r1", jobId: "j1" })).toEqual({
      context_kind: "job",
      context_id: "j1",
    });
    expect(logContextOf({ subsystemName: "cron", requestId: "t1" })).toEqual({
      context_kind: "cron",
      context_id: "t1",
    });
    expect(logContextOf({ subsystemName: "init" })?.context_kind).toBe("process");
    expect(logContextOf({ subsystemName: "http", requestId: "r1" })).toEqual({
      context_kind: "request",
      context_id: "r1",
    });
  });

  it("leaves lines outside any of those without a context", () => {
    expect(logContextOf({ subsystemName: "db" })).toBeUndefined();
  });
});
