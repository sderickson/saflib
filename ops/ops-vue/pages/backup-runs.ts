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
  /** false: a read-back didn't match; true: every database was read back and matched; else null. */
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
    // A mismatch anywhere is a mismatch; verified only when every database was read back.
    r.verified = r.backups.some((b) => b.verified_ok === false)
      ? false
      : r.backups.every((b) => b.verified_ok === true)
        ? true
        : null;
  }
  return runs;
}

/**
 * A created/updated value as a Date: epoch milliseconds, epoch seconds, or
 * an ISO-ish string (`2026-08-10 18:48:39.639452+00:00`, with or without
 * `T`, fraction or zone; no zone means UTC). Null when it isn't a time.
 */
export function parseStatTime(v: unknown): Date | null {
  if (typeof v === "number" || (typeof v === "string" && /^\d+$/.test(v))) {
    const n = Number(v);
    if (n < 1e8) return null;
    return new Date(n > 1e11 ? n : n * 1000);
  }
  if (typeof v !== "string") return null;
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)(?:\.(\d+))?\s*(Z|[+-]\d{2}:?\d{2})?$/.exec(v.trim());
  if (!m) return null;
  const ms = m[3] ? `.${m[3].slice(0, 3).padEnd(3, "0")}` : "";
  const zone = !m[4] || m[4] === "Z" ? "Z" : m[4].includes(":") ? m[4] : `${m[4].slice(0, 3)}:${m[4].slice(3)}`;
  const d = new Date(`${m[1]}T${m[2]}${ms}${zone}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** A created/updated value in local time like the rest of the admin, or as is when it isn't a time. */
export function formatStatTime(v: unknown, format: (iso: string) => string): string {
  if (v === null || v === undefined || v === "") return "—";
  const d = parseStatTime(v);
  return d ? format(d.toISOString()) : String(v);
}

/**
 * A table's data range: earliest created to latest updated (latest created
 * when the table has no updated_at, e.g. drizzle's migrations table).
 */
export function tableDateRange(
  t: { created_min?: unknown; created_max?: unknown; updated_max?: unknown },
  format: (iso: string) => string,
): { from: string; to: string } | null {
  const end = t.updated_max ?? t.created_max;
  if ((t.created_min === null || t.created_min === undefined) && (end === null || end === undefined)) return null;
  return { from: formatStatTime(t.created_min, format), to: formatStatTime(end, format) };
}
