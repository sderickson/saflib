import type { DbKey } from "@saflib/drizzle";
import type { ObjectStore } from "@saflib/object-store";
import { getBackup, listBackups } from "@saflib/ops-db";
import { throwError } from "@saflib/utils";
import { downloadBackup, restoreBackup } from "./restore.ts";

const USAGE = `Usage:
  backups list [--db <name>]           backups kept, newest first
  backups download <id> --to <file>    verified, decompressed copy (to look at; delete it after)
  backups restore <id> --yes           put it back over the live file; stop the app first (both colors)`;

/**
 * The `backups` command products ship in their ops package (run inside the
 * app image, where the backups store's credentials and data volumes are).
 * Returns the exit code.
 */
export async function runBackupsCli(
  argv: string[],
  deps: { dbKey: DbKey; store: ObjectStore | undefined; out?: (line: string) => void },
): Promise<number> {
  const out = deps.out ?? ((l: string) => console.log(l));
  const [command, ...rest] = argv;
  const flag = (name: string) => {
    const i = rest.indexOf(name);
    return i >= 0 ? rest[i + 1] : undefined;
  };
  const positional = rest.filter((a, i) => !a.startsWith("--") && !rest[i - 1]?.startsWith("--"));

  if (command === "list") {
    const db = flag("--db");
    const rows = (await throwError(listBackups(deps.dbKey))).filter((b) => !db || b.database === db);
    for (const b of rows) {
      out(
        [b.id, b.started_at.toISOString(), b.database, b.tag, b.status, b.size_bytes ?? "-", b.verified_ok === false ? "HASH-MISMATCH" : ""]
          .join("\t")
          .trimEnd(),
      );
    }
    if (!rows.length) out("No backups.");
    return 0;
  }

  if (command === "download" || command === "restore") {
    if (!deps.store) {
      out("Backups aren't configured here (no backups store).");
      return 1;
    }
    const id = positional[0];
    const backup = id ? await throwError(getBackup(deps.dbKey, id)) : undefined;
    if (!backup) {
      out(`No backup ${id ?? "(missing id)"}. Run \`backups list\`.`);
      return 1;
    }
    if (backup.status === "failed" || !backup.object_key) {
      out(`Backup ${backup.id} failed and has nothing stored.`);
      return 1;
    }
    if (command === "download") {
      const to = flag("--to");
      if (!to) {
        out(USAGE);
        return 1;
      }
      await downloadBackup(deps.store, backup, to);
      out(`Wrote ${to} (hash and integrity checked). Delete it when you're done.`);
      return 0;
    }
    if (!rest.includes("--yes")) {
      out(
        `This replaces ${backup.source_path ?? "the live file"} with the ${backup.database} backup from ${backup.started_at.toISOString()}.\n` +
          `Stop the app (both colors) first, then run again with --yes. The current file is kept as <file>.replaced-<time> for a week.`,
      );
      return 1;
    }
    const { target, replaced } = await restoreBackup(deps.store, backup);
    out(`Restored ${backup.database} to ${target}.${replaced ? ` The previous file is at ${replaced}.` : ""}`);
    return 0;
  }

  out(USAGE);
  return command ? 1 : 0;
}
