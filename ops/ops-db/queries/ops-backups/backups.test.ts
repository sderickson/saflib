import { describe, it, expect } from "vitest";
import { throwError } from "@saflib/utils";
import { opsDb } from "../../index.ts";
import {
  claimBackup,
  failStaleBackups,
  finishBackup,
  getLatestPassedBackup,
  listBackups,
  listBackupsStartedBefore,
  markBackupsDeleted,
} from "./backups.ts";

describe("ops backups", () => {
  it("claims each key once, finishes, and finds the latest passed backup", async () => {
    const dbKey = opsDb.connect();
    const a = await throwError(claimBackup(dbKey, { database: "main", tag: "daily", claimKey: "daily:main:2026-11-26", now: new Date("2026-11-26T03:00:00Z") }));
    expect(a?.status).toBe("running");
    expect(await throwError(claimBackup(dbKey, { database: "main", tag: "daily", claimKey: "daily:main:2026-11-26" }))).toBeUndefined();
    await throwError(finishBackup(dbKey, a!.id, { status: "ok", sha256: "abc", stats: { tables: { t: { rows: 3 } } } }));
    const b = await throwError(claimBackup(dbKey, { database: "main", tag: "daily", claimKey: "daily:main:2026-11-27", now: new Date("2026-11-27T03:00:00Z") }));
    await throwError(finishBackup(dbKey, b!.id, { status: "suspicious", problems: ["t shrank"] }));
    const latest = await throwError(getLatestPassedBackup(dbKey, "main"));
    expect(latest?.id).toBe(a!.id);
    expect(JSON.parse(latest!.stats!)).toEqual({ tables: { t: { rows: 3 } } });
    expect((await throwError(listBackups(dbKey))).map((r) => r.status)).toEqual(["suspicious", "ok"]);

    const old = await throwError(listBackupsStartedBefore(dbKey, new Date("2026-11-27T00:00:00Z")));
    expect(old.map((r) => r.id)).toEqual([a!.id]);
    await throwError(markBackupsDeleted(dbKey, [a!.id]));
    expect(await throwError(listBackups(dbKey))).toHaveLength(1);
  });

  it("fails backups a dead process left running", async () => {
    const dbKey = opsDb.connect();
    await throwError(claimBackup(dbKey, { database: "main", tag: "manual", claimKey: "m1", now: new Date("2026-11-27T00:00:00Z") }));
    expect(await throwError(failStaleBackups(dbKey, new Date("2026-11-27T01:00:00Z")))).toBe(1);
    expect((await throwError(listBackups(dbKey)))[0]).toMatchObject({ status: "failed" });
  });
});
