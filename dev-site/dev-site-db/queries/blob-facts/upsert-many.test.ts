import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";
import { upsertMany } from "./upsert-many.ts";
import { getByHashes } from "./get-by-hashes.ts";

describe("blob-facts", () => {
  let dbKey: DbKey;

  beforeAll(() => {
    dbKey = devSiteDbManager.connect();
  });

  afterAll(() => {
    devSiteDbManager.disconnect(dbKey);
  });

  beforeEach(() => {
    devSiteDbManager.clearAllTablesForTests(dbKey);
  });

  it("upsertMany + getByHashes round-trip", async () => {
    const hash = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    await throwError(
      upsertMany(dbKey, [
        {
          blobHash: hash,
          analyzerVersion: "1",
          lineCount: 3,
          exports: [{ name: "add", kind: "function" }],
          testCases: [],
          computedAt: new Date("2026-01-01T00:00:00Z"),
        },
      ]),
    );
    const listed = await throwError(getByHashes(dbKey, [hash]));
    expect(listed).toHaveLength(1);
    expect(listed[0].exports).toEqual([{ name: "add", kind: "function" }]);
  });

  it("upsertMany updates on analyzer version bump", async () => {
    const hash = "cccccccccccccccccccccccccccccccccccccccc";
    await throwError(
      upsertMany(dbKey, [
        {
          blobHash: hash,
          analyzerVersion: "1",
          lineCount: 1,
          exports: [],
          testCases: [],
          computedAt: new Date("2026-01-01T00:00:00Z"),
        },
      ]),
    );
    await throwError(
      upsertMany(dbKey, [
        {
          blobHash: hash,
          analyzerVersion: "2",
          lineCount: 2,
          exports: [{ name: "x", kind: "const" }],
          testCases: [],
          computedAt: new Date("2026-01-02T00:00:00Z"),
        },
      ]),
    );
    const listed = await throwError(getByHashes(dbKey, [hash]));
    expect(listed[0].analyzerVersion).toBe("2");
    expect(listed[0].lineCount).toBe(2);
    expect(listed[0].exports).toEqual([{ name: "x", kind: "const" }]);
  });
});
