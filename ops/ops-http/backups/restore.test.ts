import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { existsSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { opsDb } from "@saflib/ops-db";
import { TestObjectStore } from "@saflib/object-store";
import { runBackup, type BackupContext } from "./runner.ts";
import { downloadBackup, pruneReplacedFiles, restoreBackup } from "./restore.ts";

function setup() {
  const dir = mkdtempSync(join(tmpdir(), "rs-"));
  const path = join(dir, "main.sqlite");
  const live = new Database(path);
  live.pragma("journal_mode = WAL");
  live.exec(`CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT); INSERT INTO notes (body) VALUES ('kept')`);
  const store = new TestObjectStore();
  const ctx: BackupContext = { dbKey: opsDb.connect(), config: { databases: [{ name: "main", path }], store } };
  return { dir, path, live, store, ctx };
}

describe("restore", () => {
  it("downloads a verified copy, and puts it back with the old file moved aside", async () => {
    const { dir, path, live, store, ctx } = setup();
    const b = (await runBackup(ctx, ctx.config.databases[0]!, "manual", "r1"))!;
    expect(b.source_path).toBe(path);

    const copy = join(dir, "copy.sqlite");
    await downloadBackup(store, b, copy);
    expect(new Database(copy, { readonly: true }).prepare("SELECT body FROM notes").all()).toEqual([{ body: "kept" }]);

    live.exec(`DELETE FROM notes`);
    live.close();
    const { target, replaced } = await restoreBackup(store, b, { now: new Date("2026-11-27T10:00:00Z") });
    expect(target).toBe(path);
    expect(replaced).toBe(`${path}.replaced-2026-11-27T10-00-00-000Z`);
    expect(new Database(path, { readonly: true }).prepare("SELECT body FROM notes").all()).toEqual([{ body: "kept" }]);
    expect(new Database(replaced!, { readonly: true }).prepare("SELECT count(*) AS n FROM notes").get()).toEqual({ n: 0 });
  });

  it("refuses a stored object that doesn't match its hash", async () => {
    const { dir, store, ctx } = setup();
    const b = (await runBackup(ctx, ctx.config.databases[0]!, "manual", "r2"))!;
    await store.deleteFile(b.object_key!);
    await store.uploadFile(b.object_key!, Readable.from([Buffer.from("not a backup")]));
    const copy = join(dir, "bad.sqlite");
    await expect(downloadBackup(store, b, copy)).rejects.toThrow();
    expect(existsSync(copy)).toBe(false);
  });

  it("prunes replaced files after a week", () => {
    const { dir, path } = setup();
    const old = `${path}.replaced-2026-11-01T00-00-00-000Z`;
    const recent = `${path}.replaced-2026-11-26T00-00-00-000Z`;
    writeFileSync(old, "x");
    writeFileSync(recent, "x");
    utimesSync(old, new Date("2026-11-01"), new Date("2026-11-01"));
    expect(pruneReplacedFiles([path], 7, new Date("2026-11-27"))).toBe(1);
    expect(existsSync(old)).toBe(false);
    expect(existsSync(recent)).toBe(true);
    expect(existsSync(join(dir, "main.sqlite"))).toBe(true);
  });
});
