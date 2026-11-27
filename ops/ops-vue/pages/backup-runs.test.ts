import { describe, it, expect } from "vitest";
import type { OpsBackupResponse } from "@saflib/ops-spec";
import { formatStatTime, groupBackupRuns } from "./backup-runs.ts";

const b = (database: string, at: string, tag = "daily", status: OpsBackupResponse["status"] = "ok", rows = 1): OpsBackupResponse => ({
  id: `${database}-${at}`,
  database,
  tag: tag as OpsBackupResponse["tag"],
  status,
  started_at: at,
  finished_at: at,
  size_bytes: 100,
  raw_bytes: 1000,
  sha256: "h",
  object_key: "k",
  migration: null,
  tables: { t: { rows } },
  problems: [],
  error: null,
  verified_at: null,
  verified_ok: null,
});

describe("groupBackupRuns", () => {
  it("groups each run's databases and sums them, worst status wins", () => {
    const runs = groupBackupRuns([
      b("main", "2026-11-27T03:00:01Z"),
      b("audit", "2026-11-27T03:00:03Z", "daily", "suspicious", 5),
      b("main", "2026-11-26T03:00:01Z"),
      b("main", "2026-11-27T09:12:00Z", "manual"),
    ]);
    expect(runs.map((r) => [r.tag, r.backups.map((x) => x.database), r.status, r.size_bytes, r.rows])).toEqual([
      ["manual", ["main"], "ok", 100, 1],
      ["daily", ["audit", "main"], "suspicious", 200, 6],
      ["daily", ["main"], "ok", 100, 1],
    ]);
  });
});

describe("formatStatTime", () => {
  it("reads ms, seconds and ISO strings, and leaves the rest", () => {
    const ms = formatStatTime(1795757554589);
    expect(formatStatTime(1795757554)).toBe(ms);
    expect(formatStatTime("2026-11-27 03:00:00")).not.toBe("2026-11-27 03:00:00");
    expect(formatStatTime("abc")).toBe("abc");
    expect(formatStatTime(null)).toBe("—");
  });
});
