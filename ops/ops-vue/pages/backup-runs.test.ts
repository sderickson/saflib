import { describe, it, expect } from "vitest";
import type { OpsBackupResponse } from "@saflib/ops-spec";
import { formatStatTime, groupBackupRuns, parseStatTime, tableDateRange } from "./backup-runs.ts";

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

describe("run verification", () => {
  it("is verified only when every database was read back and matched", () => {
    const one = { ...b("main", "2026-11-27T03:00:01Z"), verified_ok: true };
    const other = b("audit", "2026-11-27T03:00:02Z");
    expect(groupBackupRuns([one, other])[0]!.verified).toBeNull();
    expect(groupBackupRuns([one, { ...other, verified_ok: true }])[0]!.verified).toBe(true);
    expect(groupBackupRuns([one, { ...other, verified_ok: false }])[0]!.verified).toBe(false);
  });
});

describe("parseStatTime", () => {
  it("reads ms, seconds and the string shapes databases use", () => {
    const at = Date.UTC(2026, 7, 10, 18, 48, 39, 639);
    expect(parseStatTime(at)?.getTime()).toBe(at);
    expect(parseStatTime(Math.floor(at / 1000))?.getTime()).toBe(at - 639);
    expect(parseStatTime("2026-08-10 18:48:39.639452+00:00")?.getTime()).toBe(at);
    expect(parseStatTime("2026-08-10T18:48:39.639Z")?.getTime()).toBe(at);
    expect(parseStatTime("2026-08-10 18:48:39")?.getTime()).toBe(at - 639);
    expect(parseStatTime("2026-08-10 20:48:39+0200")?.getTime()).toBe(at - 639);
    expect(parseStatTime("abc")).toBeNull();
    expect(parseStatTime(42)).toBeNull();
  });

  it("formats through the admin's formatter, passing other values through", () => {
    const fmt = (iso: string) => `fmt:${iso}`;
    expect(formatStatTime("2026-08-10 18:48:39.639452+00:00", fmt)).toBe("fmt:2026-08-10T18:48:39.639Z");
    expect(formatStatTime("abc", fmt)).toBe("abc");
    expect(formatStatTime(null, fmt)).toBe("—");
  });
});

describe("tableDateRange", () => {
  const fmt = (iso: string) => iso.slice(0, 10);
  it("runs from earliest created to latest updated", () => {
    expect(tableDateRange({ created_min: 1_700_000_000_000, created_max: 1_710_000_000_000, updated_max: 1_720_000_000_000 }, fmt)).toEqual({
      from: "2023-11-14",
      to: "2024-07-03",
    });
  });
  it("falls back to latest created without updated_at", () => {
    expect(tableDateRange({ created_min: 1_700_000_000_000, created_max: 1_710_000_000_000 }, fmt)).toEqual({ from: "2023-11-14", to: "2024-03-09" });
  });
  it("is null without timestamps", () => {
    expect(tableDateRange({}, fmt)).toBeNull();
  });
});
