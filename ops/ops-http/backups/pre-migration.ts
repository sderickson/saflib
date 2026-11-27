import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { addPreMigrationHook } from "@saflib/drizzle";
import { runBackup, type BackupContext } from "./runner.ts";

/**
 * Before migrations run on an existing database, snapshot it (VACUUM INTO,
 * on its own connection, in a second or so) into `dir`. The backup schedule
 * later checks, uploads and records each snapshot as a `pre-migration`
 * backup. Call at startup, before databases connect.
 */
export function enablePreMigrationBackups(dir: string): () => void {
  return addPreMigrationHook(({ path, sqlite, pending }) => {
    mkdirSync(dir, { recursive: true });
    const at = new Date();
    const file = join(dir, `${basename(path).replace(/\.(sqlite|db)$/, "")}-${at.toISOString().replace(/[:.]/g, "-")}.sqlite`);
    sqlite.prepare("VACUUM INTO ?").run(file);
    writeFileSync(`${file}.json`, JSON.stringify({ source: resolve(path), pending, at: at.toISOString() }));
  });
}

/**
 * Upload snapshots taken before migrations: each becomes a checked,
 * recorded `pre-migration` backup of the database it came from, and the
 * local file is removed.
 */
export async function uploadPreMigrationSnapshots(ctx: BackupContext, dir: string): Promise<number> {
  if (!existsSync(dir)) return 0;
  let done = 0;
  for (const name of readdirSync(dir).filter((f) => f.endsWith(".sqlite"))) {
    const file = join(dir, name);
    let source: string | undefined;
    try {
      source = (JSON.parse(readFileSync(`${file}.json`, "utf8")) as { source?: string }).source;
    } catch {
      // No sidecar: name it after the file.
    }
    const match = ctx.config.databases.find((d) => {
      const p = typeof d.path === "function" ? d.path() : d.path;
      return p && source && resolve(p) === source;
    });
    const database = match?.name ?? name.replace(/-\d{4}-\d{2}-\d{2}T.*$/, "");
    await runBackup(ctx, { name: database, path: file }, "pre-migration", `pre-migration:${database}:${name}`, source);
    rmSync(file, { force: true });
    rmSync(`${file}.json`, { force: true });
    done++;
  }
  return done;
}
