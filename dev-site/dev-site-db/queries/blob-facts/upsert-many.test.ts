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
          blob_hash: hash,
          analyzer_version: "1",
          line_count: 3,
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
            localExportUsages: [],
          },
          computed_at: new Date("2026-01-01T00:00:00Z"),
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
          blob_hash: hash,
          analyzer_version: "1",
          line_count: 1,
          specialty: {
            kind: "source",
            exports: [],
            imports: [],
            localExportUsages: [],
          },
          computed_at: new Date("2026-01-01T00:00:00Z"),
        },
      ]),
    );
    await throwError(
      upsertMany(dbKey, [
        {
          blob_hash: hash,
          analyzer_version: "2",
          line_count: 2,
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
            localExportUsages: [],
          },
          computed_at: new Date("2026-01-02T00:00:00Z"),
        },
      ]),
    );
    const listed = await throwError(getByHashes(dbKey, [hash]));
    expect(listed[0]!.analyzer_version).toBe("2");
    expect(listed[0]!.line_count).toBe(2);
    expect(blobFactExports(listed[0]!)).toEqual([
      { name: "x", kind: "const", signature: "= 1", docstring: "X value." },
    ]);
  });
});
