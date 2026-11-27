import { describe, it, expect } from "vitest";
import type { OpsBackup } from "@saflib/ops-db";
import { summarizeBackups } from "./tile.ts";

const now = new Date("2026-11-27T12:00:00Z");
const b = (database: string, hoursAgo: number, status: string, extra: Partial<OpsBackup> = {}): OpsBackup => ({
  id: `${database}-${hoursAgo}`,
  database,
  tag: "daily",
  claim_key: `${database}-${hoursAgo}`,
  started_at: new Date(now.getTime() - hoursAgo * 3_600_000),
  finished_at: null,
  status,
  size_bytes: 1,
  raw_bytes: 1,
  sha256: "h",
  object_key: "k",
  migration: null,
  stats: null,
  problems: null,
  error: null,
  verified_at: null,
  verified_ok: null,
  deleted_at: null,
  ...extra,
});

describe("summarizeBackups", () => {
  it("is ok when every database has a recent good backup", () => {
    expect(summarizeBackups(["main", "kratos"], [b("main", 5, "ok"), b("kratos", 6, "ok")], now)).toEqual({
      value: "Last 5h ago",
      detail: "2 databases backed up and checked",
      tone: "ok",
    });
  });

  it("warns on suspicious, missing or day-and-a-half-old backups", () => {
    expect(summarizeBackups(["main"], [b("main", 2, "suspicious"), b("main", 26, "ok")], now).tone).toBe("warn");
    expect(summarizeBackups(["main", "kratos"], [b("main", 2, "ok")], now)).toMatchObject({ tone: "warn", detail: "kratos: no backup yet" });
    expect(summarizeBackups(["main"], [b("main", 40, "ok")], now).tone).toBe("warn");
  });

  it("is bad when the last one failed, the good one is old, or a read-back mismatched", () => {
    expect(summarizeBackups(["main"], [b("main", 1, "failed"), b("main", 20, "ok")], now).tone).toBe("bad");
    expect(summarizeBackups(["main"], [b("main", 80, "ok")], now).tone).toBe("bad");
    expect(summarizeBackups(["main"], [b("main", 2, "ok", { verified_ok: false })], now).tone).toBe("bad");
  });
});
