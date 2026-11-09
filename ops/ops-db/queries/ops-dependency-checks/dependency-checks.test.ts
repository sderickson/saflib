import { describe, expect, it } from "vitest";
import { throwError } from "@saflib/utils";
import { getLatestDependencyCheck, opsDb, recordDependencyCheck } from "../../index.ts";

describe("dependency checks", () => {
  it("returns the newest check and keeps 30", async () => {
    const dbKey = opsDb.connect();
    expect(await throwError(getLatestDependencyCheck(dbKey))).toBeUndefined();
    for (let i = 0; i < 32; i++) {
      await throwError(recordDependencyCheck(dbKey, { checkedAt: new Date(Date.UTC(2026, 10, 1, i)), lockfileHash: `h${i}`, report: { i } }));
    }
    const latest = await throwError(getLatestDependencyCheck(dbKey));
    expect(latest?.lockfile_hash).toBe("h31");
    expect(JSON.parse(latest!.report)).toEqual({ i: 31 });
    const db = (await import("../../instances.ts")).opsDbManager.get(dbKey)!;
    expect(db.$client.prepare("select count(*) as n from ops_dependency_checks").get()).toEqual({ n: 30 });
  });
});
