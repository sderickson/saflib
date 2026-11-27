import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { opsDb } from "@saflib/ops-db";
import { TestObjectStore } from "@saflib/object-store";
import { runBackup } from "./runner.ts";
import { runBackupsCli } from "./cli.ts";

describe("backups CLI", () => {
  it("lists, downloads, and only restores with --yes", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cli-"));
    const path = join(dir, "main.sqlite");
    new Database(path).exec(`CREATE TABLE t (x); INSERT INTO t VALUES (1)`);
    const store = new TestObjectStore();
    const dbKey = opsDb.connect();
    const b = (await runBackup({ dbKey, config: { databases: [{ name: "main", path }], store } }, { name: "main", path }, "manual", "c1"))!;
    const lines: string[] = [];
    const run = (...argv: string[]) => runBackupsCli(argv, { dbKey, store, out: (l) => lines.push(l) });

    expect(await run("list")).toBe(0);
    expect(lines.pop()).toMatch(new RegExp(`^${b.id}\\t.*\\tmain\\tmanual\\tok`));
    expect(await run("download", b.id, "--to", join(dir, "copy.sqlite"))).toBe(0);
    expect(await run("restore", b.id)).toBe(1);
    expect(lines.pop()).toMatch(/Stop the app/);
    expect(await run("restore", b.id, "--yes")).toBe(0);
    expect(lines.pop()).toMatch(/^Restored main to .*main\.sqlite\. The previous file is at/);
    expect(await run("restore", "nope", "--yes")).toBe(1);
  });
});
