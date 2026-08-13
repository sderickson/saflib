import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/monorepo";
import { devSiteDbManager } from "../../instances.ts";
import { upsertMany } from "./upsert-many.ts";
import { getByHashes } from "./get-by-hashes.ts";
import { blobFactExports } from "../../schemas/blob-facts.ts";

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
          specialty: {
            kind: "source",
            exports: [
              {
                name: "add",
                kind: "function",
                signature: "(a: number)",
                docstring: null,
              },
            ],
            imports: [],
          },
          computedAt: new Date("2026-01-01T00:00:00Z"),
        },
      ]),
    );
    const listed = await throwError(getByHashes(dbKey, [hash]));
    expect(listed).toHaveLength(1);
    expect(blobFactExports(listed[0]!)).toEqual([
      {
        name: "add",
        kind: "function",
        signature: "(a: number)",
        docstring: null,
      },
    ]);
  });

  it("upsertMany updates on analyzer version bump", async () => {
    const hash = "cccccccccccccccccccccccccccccccccccccccc";
    await throwError(
      upsertMany(dbKey, [
        {
          blobHash: hash,
          analyzerVersion: "1",
          lineCount: 1,
          specialty: { kind: "source", exports: [], imports: [] },
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
          specialty: {
            kind: "source",
            exports: [
              {
                name: "x",
                kind: "const",
                signature: "= 1",
                docstring: "X value.",
              },
            ],
            imports: [],
          },
          computedAt: new Date("2026-01-02T00:00:00Z"),
        },
      ]),
    );
    const listed = await throwError(getByHashes(dbKey, [hash]));
    expect(listed[0]!.analyzerVersion).toBe("2");
    expect(listed[0]!.lineCount).toBe(2);
    expect(blobFactExports(listed[0]!)).toEqual([
      { name: "x", kind: "const", signature: "= 1", docstring: "X value." },
    ]);
  });
});
