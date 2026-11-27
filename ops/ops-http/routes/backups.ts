import createError from "http-errors";
import { createHandler } from "@saflib/express";
import { getSafReporters } from "@saflib/node";
import type { OpsBackup } from "@saflib/ops-db";
import type { OpsResponseBody } from "@saflib/ops-spec";
import { opsServiceStorage } from "../context.ts";
import { recentBackups, runBackupsMaintenance, runManualBackups } from "../backups/runner.ts";

type BackupResponse = OpsResponseBody["listOpsBackups"][200]["backups"][number];

function toResponse(b: OpsBackup): BackupResponse {
  const stats = b.stats ? (JSON.parse(b.stats) as { tables?: BackupResponse["tables"] }) : {};
  return {
    id: b.id,
    database: b.database,
    tag: b.tag as BackupResponse["tag"],
    status: b.status as BackupResponse["status"],
    started_at: b.started_at.toISOString(),
    finished_at: b.finished_at?.toISOString() ?? null,
    size_bytes: b.size_bytes,
    raw_bytes: b.raw_bytes,
    sha256: b.sha256,
    object_key: b.object_key,
    migration: b.migration,
    tables: stats.tables ?? {},
    problems: b.problems ? (JSON.parse(b.problems) as string[]) : [],
    error: b.error,
    verified_at: b.verified_at?.toISOString() ?? null,
    verified_ok: b.verified_ok,
  };
}

export const listOpsBackupsHandler = createHandler(async function (req, res) {
  const { backups } = opsServiceStorage.getStore()!;
  const days = Math.min(Math.max(Number(req.query.days ?? 62) || 62, 1), 400);
  const response: OpsResponseBody["listOpsBackups"][200] = backups
    ? {
        configured: true,
        retention_days: backups.config.retentionDays ?? 14,
        databases: backups.config.databases.map((d) => d.name),
        backups: (await recentBackups(backups, days)).map(toResponse),
      }
    : { configured: false, retention_days: null, databases: [], backups: [] };
  res.status(200).json(response);
});

export const runOpsBackupsHandler = createHandler(async function (_req, res) {
  const { backups } = opsServiceStorage.getStore()!;
  if (!backups) throw createError(404, "Backups aren't configured");
  // Uploads can take a while; the page polls GET /ops/backups.
  void runManualBackups(backups).catch((e) => getSafReporters().logError(e instanceof Error ? e : new Error(String(e))));
  res.status(202).json({ started: true });
});

/** The daily maintenance, run by the product's `backups` cron job. */
export const runOpsBackupsMaintenanceHandler = createHandler(async function (_req, res) {
  const { backups } = opsServiceStorage.getStore()!;
  const response: OpsResponseBody["runOpsBackupsMaintenance"][200] = backups
    ? { configured: true, ...(await runBackupsMaintenance(backups)) }
    : { configured: false, backed_up: 0, failed: 0, removed: 0, verified: 0 };
  res.status(200).json(response);
});
