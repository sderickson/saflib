import type { OpsBackup } from "@saflib/ops-db";
import type { DigestTile, DigestTileProvider } from "../digest/tiles.ts";
import { recentBackups, type BackupContext } from "./runner.ts";

const HOUR = 3_600_000;
const ago = (ms: number) => {
  const h = ms / HOUR;
  return h < 1 ? "under an hour ago" : h < 48 ? `${Math.round(h)}h ago` : `${Math.round(h / 24)} days ago`;
};

/** The Status tile for backups, from each database's latest finished backup. */
export function summarizeBackups(
  databases: string[],
  backups: OpsBackup[],
  now: Date,
): Pick<DigestTile, "value" | "detail" | "tone"> {
  const finished = backups.filter((b) => b.status !== "running");
  const problems: string[] = [];
  let tone: DigestTile["tone"] = "ok";
  const worse = (t: DigestTile["tone"]) => {
    if (t === "bad" || (t === "warn" && tone === "ok")) tone = t;
  };
  let newestPassed = 0;
  for (const db of databases) {
    const mine = finished.filter((b) => b.database === db);
    const latest = mine[0];
    const passed = mine.find((b) => b.status === "ok");
    if (!latest) {
      problems.push(`${db}: no backup yet`);
      worse("warn");
      continue;
    }
    if (latest.status === "failed") {
      problems.push(`${db}: last backup failed`);
      worse("bad");
    } else if (latest.status === "suspicious") {
      problems.push(`${db}: last backup looks wrong`);
      worse("warn");
    }
    if (!passed) continue;
    const age = now.getTime() - passed.started_at.getTime();
    newestPassed = Math.max(newestPassed, passed.started_at.getTime());
    if (age > 72 * HOUR) {
      problems.push(`${db}: last good backup ${ago(age)}`);
      worse("bad");
    } else if (age > 36 * HOUR) {
      problems.push(`${db}: last good backup ${ago(age)}`);
      worse("warn");
    }
    if (passed.verified_ok === false) {
      problems.push(`${db}: stored copy didn't match its hash`);
      worse("bad");
    }
  }
  const value = newestPassed ? `Last ${ago(now.getTime() - newestPassed)}` : "None yet";
  const detail = problems.length ? problems.slice(0, 2).join("; ") : `${databases.length} databases backed up and checked`;
  return { value, detail, tone };
}

/** Overview/Status tile. Without a backups store it warns only in production. */
export function backupsTile(ctx: BackupContext | undefined): DigestTileProvider {
  const base = { key: "backups", group: "system" as const, label: "Backups" };
  return {
    key: "backups",
    label: "Backups",
    async tiles() {
      if (!ctx) {
        if (process.env.DEPLOYMENT_NAME !== "production") return null;
        return { ...base, value: "Not set up", detail: "No backups store configured; only disk snapshots", tone: "warn" };
      }
      const now = ctx.now?.() ?? new Date();
      const backups = await recentBackups(ctx, 14);
      return { ...base, ...summarizeBackups(ctx.config.databases.map((d) => d.name), backups, now) };
    },
  };
}
