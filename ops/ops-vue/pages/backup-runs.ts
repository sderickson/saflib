import type { OpsBackupResponse } from "@saflib/ops-spec";

/** One backup run: every database's backup of the same kind, started together. */
export interface BackupRun {
  key: string;
  tag: string;
  started_at: string;
  status: "running" | "ok" | "suspicious" | "failed";
  backups: OpsBackupResponse[];
  size_bytes: number;
  rows: number;
  /** Whether every read-back done so far matched (null when none yet). */
  verified: boolean | null;
}

const RANK = { ok: 0, suspicious: 1, running: 2, failed: 3 } as const;
const GAP_MS = 10 * 60_000;

export const totalRows = (b: OpsBackupResponse) => Object.values(b.tables).reduce((s, t) => s + t.rows, 0);

/** Group backups (newest first) into runs: same tag, started within ten minutes of the previous one. */
export function groupBackupRuns(backups: OpsBackupResponse[]): BackupRun[] {
  const sorted = [...backups].sort((a, b) => b.started_at.localeCompare(a.started_at));
  const runs: BackupRun[] = [];
  for (const b of sorted) {
    const last = runs[runs.length - 1];
    const oldest = last?.backups[last.backups.length - 1];
    if (last && last.tag === b.tag && oldest && Date.parse(oldest.started_at) - Date.parse(b.started_at) < GAP_MS) {
      last.backups.push(b);
      last.started_at = b.started_at;
    } else {
      runs.push({ key: b.id, tag: b.tag, started_at: b.started_at, status: "ok", backups: [b], size_bytes: 0, rows: 0, verified: null });
    }
  }
  for (const r of runs) {
    r.backups.sort((a, b) => a.database.localeCompare(b.database));
    r.status = r.backups.reduce<BackupRun["status"]>((w, b) => (RANK[b.status] > RANK[w] ? b.status : w), "ok");
    r.size_bytes = r.backups.reduce((s, b) => s + (b.size_bytes ?? 0), 0);
    r.rows = r.backups.reduce((s, b) => s + totalRows(b), 0);
    const checked = r.backups.filter((b) => b.verified_ok !== null);
    r.verified = checked.length ? checked.every((b) => b.verified_ok) : null;
  }
  return runs;
}

/**
 * A created/updated value as a local date and time: epoch milliseconds,
 * epoch seconds or an ISO string; anything else as is.
 */
export function formatStatTime(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  let d: Date | null = null;
  if (typeof v === "number") d = new Date(v > 1e11 ? v : v * 1000);
  else if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) d = new Date(v.includes("T") || v.endsWith("Z") ? v : `${v.replace(" ", "T")}Z`);
  else if (typeof v === "string" && /^\d+$/.test(v)) {
    const n = Number(v);
    d = new Date(n > 1e11 ? n : n * 1000);
  }
  if (!d || Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}
