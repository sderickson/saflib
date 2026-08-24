import { describe, it, expect, afterEach } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { DbKey } from "@saflib/drizzle";
import { auditDb } from "./instances.ts";
import { auditDbManager } from "./instances.ts";

type SqliteDatabase = import("better-sqlite3").Database;

describe("audit-db pragmas (on-disk)", () => {
  let dbPath: string | undefined;
  let dbKey: DbKey;

  afterEach(() => {
    auditDb.disconnect(dbKey);
    if (dbPath !== undefined && existsSync(dbPath)) {
      rmSync(dbPath, { force: true });
    }
  });

  it("sets journal_mode WAL and synchronous FULL on a non-test file database", () => {
    dbPath = join(tmpdir(), `audit-pragmas-${Date.now()}.sqlite`);
    dbKey = auditDb.connect({
      onDisk: dbPath,
      overrideTestDefault: true,
    });

    const drizzleDb = auditDbManager.get(dbKey)!;
    const sqlite = (
      drizzleDb as unknown as { session: { client: SqliteDatabase } }
    ).session.client;

    const journalMode = sqlite.pragma("journal_mode", { simple: true });
    const synchronous = sqlite.pragma("synchronous", { simple: true });

    expect(String(journalMode).toLowerCase()).toBe("wal");
    expect(synchronous).toBe(2);
  });
});
