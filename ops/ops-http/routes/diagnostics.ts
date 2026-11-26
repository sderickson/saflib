import createError from "http-errors";
import { createHandler } from "@saflib/express";
import { getSafContext } from "@saflib/node";
import type { OpsResponseBody } from "@saflib/ops-spec";
import { resolveDiagnosticIssues } from "@saflib/errors-db";
import { opsServiceStorage } from "../context.ts";
import { diagTag } from "../diagnostics/probes.ts";
import { queryDate } from "./_helpers.ts";

const RUN_ID = /^[A-Za-z0-9]{6,32}$/;

function probes() {
  return opsServiceStorage.getStore()!.diagnostics!.probes;
}

export const listOpsDiagnosticsHandler = createHandler(async (_req, res) => {
  const list = await Promise.all(
    probes().map(async (p) => ({
      id: p.id,
      side: p.side,
      label: p.label,
      what: p.what,
      destination: p.destination,
      link: p.link,
      skip_reason: (await p.skipReason?.()) ?? null,
    })),
  );
  res.status(200).json({ probes: list } satisfies OpsResponseBody["listOpsDiagnostics"][200]);
});

export const runOpsDiagnosticProbeHandler = createHandler(async (req, res) => {
  const runId = String(req.params.run_id);
  if (!RUN_ID.test(runId)) throw createError(400, "Invalid run id");
  const probe = probes().find((p) => p.id === req.params.probe_id);
  if (!probe) throw createError(404, "No such probe");
  if (probe.side !== "server" || !probe.run) throw createError(409, "This probe runs in the browser");
  const skip = await probe.skipReason?.();
  if (skip) throw createError(409, skip);
  const startedAt = new Date();
  // The server-500 probe throws here on purpose; the error middleware turns
  // that into its issue.
  const ref = await probe.run({ runId, tag: diagTag(runId, probe.id) });
  if (ref) opsServiceStorage.getStore()!.diagnostics!.registry.remember(runId, probe.id, ref);
  res.status(202).json({ started_at: startedAt.toISOString() } satisfies OpsResponseBody["runOpsDiagnosticProbe"][202]);
});

export const getOpsDiagnosticRunHandler = createHandler(async (req, res) => {
  const runId = String(req.params.run_id);
  if (!RUN_ID.test(runId)) throw createError(400, "Invalid run id");
  const since = queryDate(req.query.since);
  if (!since) throw createError(400, "since is required");
  const { registry } = opsServiceStorage.getStore()!.diagnostics!;
  const results = await Promise.all(
    probes().map(async (p) => {
      let found = null;
      try {
        found = await p.find({ runId, since, remembered: registry.recall(runId, p.id) });
      } catch {
        // A destination that can't be read just hasn't shown the signal.
      }
      return { probe_id: p.id, landed_at: found?.at.toISOString() ?? null, ref: found?.ref ?? null };
    }),
  );
  res.status(200).json({ results } satisfies OpsResponseBody["getOpsDiagnosticRun"][200]);
});

export const clearOpsDiagnosticsHandler = createHandler(async (_req, res) => {
  const { issuesDbKey } = opsServiceStorage.getStore()!;
  const actor = getSafContext().auth?.userId ?? "diagnostics";
  const resolved = issuesDbKey ? await resolveDiagnosticIssues(issuesDbKey, actor) : 0;
  res.status(200).json({ resolved_issues: resolved } satisfies OpsResponseBody["clearOpsDiagnostics"][200]);
});
