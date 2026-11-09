import createError from "http-errors";
import { createHandler } from "@saflib/express";
import type { OpsAlertResponse, OpsResponseBody } from "@saflib/ops-spec";
import {
  ackAlert,
  listAlerts,
  OpsAlertNotFoundError,
  pruneResolvedAlerts,
  upsertAlerts,
  type IncomingAlert,
  type OpsAlert,
} from "@saflib/ops-db";
import { throwError } from "@saflib/utils";
import type { OpsCaller } from "../auth/ops-token-resolver.ts";
import { opsServiceStorage } from "../context.ts";
import { queryDate, queryString } from "./_helpers.ts";

function parseObject(json: string): Record<string, string> {
  try {
    const v = JSON.parse(json) as unknown;
    return v && typeof v === "object" ? (v as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function mapAlert(a: OpsAlert): OpsAlertResponse {
  return {
    id: a.id,
    fingerprint: a.fingerprint,
    alertname: a.alertname,
    severity: a.severity,
    status: a.status,
    labels: parseObject(a.labels),
    starts_at: a.starts_at.toISOString(),
    ends_at: a.ends_at?.toISOString() ?? null,
    last_received_at: a.last_received_at.toISOString(),
    acked_at: a.acked_at?.toISOString() ?? null,
    acked_by: a.acked_by,
    untrusted: { annotations: parseObject(a.annotations) },
  };
}

export const receiveOpsAlertsHandler = createHandler(async function (req, res) {
  const { dbKey } = opsServiceStorage.getStore()!;
  const alerts = (req.body as { alerts: IncomingAlert[] }).alerts;
  const received = await throwError(upsertAlerts(dbKey, alerts));
  // Keep 30 days of resolved alerts; pruning here is a cheap indexed delete.
  await throwError(pruneResolvedAlerts(dbKey, new Date(Date.now() - 30 * 86_400_000)));
  const response: OpsResponseBody["receiveOpsAlerts"][200] = { received };
  res.status(200).json(response);
});

export const listOpsAlertsHandler = createHandler(async function (req, res) {
  const { dbKey } = opsServiceStorage.getStore()!;
  const status = queryString(req.query.status) ?? "firing";
  const rows = await throwError(
    listAlerts(dbKey, {
      statuses: status === "all" ? undefined : [status as OpsAlert["status"]],
      activeSince: queryDate(req.query.since),
      unacked: String(req.query.unacked) === "true",
      limit: req.query.limit === undefined ? undefined : Number(req.query.limit),
    }),
  );
  const response: OpsResponseBody["listOpsAlerts"][200] = { alerts: rows.map(mapAlert) };
  res.status(200).json(response);
});

export const ackOpsAlertHandler = createHandler(async function (req, res) {
  const { dbKey } = opsServiceStorage.getStore()!;
  const caller = res.locals.opsToken as OpsCaller | undefined;
  const { result, error } = await ackAlert(
    dbKey,
    String(req.params.id),
    caller ? `ops_token:${caller.id}` : "unknown",
  );
  if (error) {
    if (error instanceof OpsAlertNotFoundError) throw createError(404, `No alert with id ${req.params.id}`);
    throw error satisfies never;
  }
  const response: OpsResponseBody["ackOpsAlert"][200] = { alert: mapAlert(result) };
  res.status(200).json(response);
});
