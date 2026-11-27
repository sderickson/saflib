import { createHandler } from "@saflib/express";
import type { OpsDigest, OpsResponseBody } from "@saflib/ops-spec";
import { countBootsSince, listAlerts, listBoots } from "@saflib/ops-db";
import { listIssues } from "@saflib/errors-db";
import { countLogsByLevel, listTemplates } from "@saflib/node-log-db";
import { throwError } from "@saflib/utils";
import { opsServiceStorage } from "../context.ts";
import { runHealthChecks } from "../health/run-health-checks.ts";
import { digestMetrics } from "../metrics/digest-metrics.ts";
import { digestActivity } from "../metrics/digest-activity.ts";
import { mapAlert, PIPELINE_STALE_MS, WATCHDOG_ALERTNAME } from "./alerts.ts";
import { latestDependencies } from "./get-ops-dependencies.ts";
import { attentionItems, builtInTiles, runTileProviders } from "../digest/tiles.ts";
import { processStats } from "../metrics/process-stats.ts";
import { digestEndpoints } from "../metrics/endpoint-stats.ts";
import { mapIssue, mapLogTemplate, mapOpsBoot, queryDate } from "./_helpers.ts";

const DAY_MS = 86_400_000;
const TOP = 10;

export const getOpsDigestHandler = createHandler(async function (req, res) {
  const { dbKey, logsDbKey, issuesDbKey, healthChecks, currentBoot, metrics: metricsConfig, dependencyChecks, acceptedAdvisories, digestTiles } =
    opsServiceStorage.getStore()!;
  // Only production is expected to have alerting wired up; elsewhere a
  // missing heartbeat is a muted note, not something to fix.
  const expectAlerting = process.env.DEPLOYMENT_NAME === "production";
  const since = queryDate(req.query.since) ?? new Date(Date.now() - DAY_MS);
  await currentBoot;

  const [health, recentDeploys, boots, metrics, activity, firing, activeInWindow, watchdog, deps, productTiles, processInfo, endpoints] = await Promise.all([
    runHealthChecks(healthChecks),
    throwError(listBoots(dbKey, { newBuildsOnly: true, limit: 50 })),
    throwError(countBootsSince(dbKey, since)),
    metricsConfig ? digestMetrics(metricsConfig, since) : Promise.resolve(null),
    digestActivity({ metrics: metricsConfig, logsDbKey }, since),
    throwError(listAlerts(dbKey, { statuses: ["firing"], excludeAlertnames: [WATCHDOG_ALERTNAME], limit: 200 })),
    throwError(listAlerts(dbKey, { activeSince: since, excludeAlertnames: [WATCHDOG_ALERTNAME], limit: 200 })),
    throwError(listAlerts(dbKey, { alertnames: [WATCHDOG_ALERTNAME], limit: 1 })),
    latestDependencies(dbKey, new Date(), acceptedAdvisories),
    runTileProviders(digestTiles ?? [], since),
    processStats(),
    digestEndpoints(metricsConfig ?? null, since),
  ]);
  const dependencies: OpsDigest["dependencies"] =
    deps || dependencyChecks
      ? {
          checked_at: deps?.checked_at ?? null,
          // Checks are on but none has finished: stale only once the
          // process has been up long enough that one should have.
          stale: deps ? deps.stale : false,
          advisories: {
            critical: deps?.advisories.filter((a) => a.severity === "critical").length ?? 0,
            high: deps?.advisories.filter((a) => a.severity === "high").length ?? 0,
            moderate: deps?.advisories.filter((a) => a.severity === "moderate").length ?? 0,
            low: deps?.advisories.filter((a) => a.severity === "low").length ?? 0,
            unknown: deps?.advisories.filter((a) => a.severity === "unknown").length ?? 0,
          },
          actionable: deps?.advisories.filter((a) => a.actionable).length ?? 0,
          outdated_direct: deps?.outdated.length ?? 0,
          renovate_due: deps?.outdated.filter((o) => o.renovate_due).length ?? 0,
          runtime_eol_soon: deps?.runtime.filter((c) => c.eol_soon).length ?? 0,
        }
      : null;
  // Never seen: no Alertmanager delivers here yet, which isn't a failure.
  const pipelineLastSeen = watchdog[0]?.last_received_at ?? null;
  const pipelineStale = pipelineLastSeen !== null && Date.now() - pipelineLastSeen.getTime() > PIPELINE_STALE_MS;
  const firingUnacked = firing.filter((a) => a.acked_at === null).length;
  const alerts: OpsDigest["alerts"] = {
    firing: firing.slice(0, TOP).map(mapAlert),
    firing_unacked: firingUnacked,
    fired_in_window: activeInWindow.length,
    pipeline_last_seen_at: pipelineLastSeen?.toISOString() ?? null,
    pipeline_missing: pipelineLastSeen === null,
    pipeline_stale: pipelineStale,
  };
  const deploys = recentDeploys.filter((b) => b.started_at >= since);

  let issues: OpsDigest["issues"] = null;
  let newIssueCount = 0;
  let regressedCount = 0;
  let openCount = 0;
  if (issuesDbKey) {
    const [fresh, regressed, top, open] = await Promise.all([
      throwError(listIssues(issuesDbKey, { windowSince: since, newInWindow: true, sort: "window_count", limit: 200 })),
      throwError(listIssues(issuesDbKey, { windowSince: since, regressedInWindow: true, sort: "window_count", limit: 200 })),
      throwError(
        listIssues(issuesDbKey, { windowSince: since, statuses: ["open", "regressed"], seenInWindow: true, sort: "window_count", limit: TOP }),
      ),
      // Everything awaiting triage, not only this window's activity.
      throwError(listIssues(issuesDbKey, { windowSince: since, statuses: ["open", "regressed"], sort: "count", limit: 200 })),
    ]);
    // Only what still needs a look: an issue first seen (or regressed) in the
    // window but since resolved or ignored doesn't, and shouldn't keep
    // needs_attention on until it ages out of the window.
    const active = (i: { status: string }) => i.status === "open" || i.status === "regressed";
    const freshActive = fresh.issues.filter(active);
    const regressedActive = regressed.issues.filter(active);
    newIssueCount = freshActive.length;
    regressedCount = regressedActive.length;
    openCount = open.issues.length;
    issues = {
      new: freshActive.slice(0, TOP).map(mapIssue),
      regressed: regressedActive.slice(0, TOP).map(mapIssue),
      top: top.issues.map(mapIssue),
      open: open.issues.slice(0, TOP).map(mapIssue),
    };
  }

  let logs: OpsDigest["logs"] = null;
  let newTemplateCount = 0;
  let newSevereTemplates = 0;
  if (logsDbKey) {
    const [levelCounts, templates] = await Promise.all([
      throwError(countLogsByLevel(logsDbKey, since)),
      throwError(listTemplates(logsDbKey, { since, onlyNew: true, limit: 200 })),
    ]);
    newTemplateCount = templates.length;
    newSevereTemplates = templates.filter((t) => t.level === "error" || t.level === "warn").length;
    logs = { level_counts: levelCounts, new_templates: templates.slice(0, TOP).map(mapLogTemplate) };
  }

  const summaryCounts = {
    health_status: health.status,
    new_issues: newIssueCount,
    regressed_issues: regressedCount,
    open_issues: openCount,
    new_log_templates: newTemplateCount,
    deploys: deploys.length,
    boots,
    firing_alerts: firingUnacked,
  };
  const parts = {
    since: since.toISOString(),
    generated_at: new Date().toISOString(),
    health: { status: health.status, failing: health.checks.filter((c) => c.status !== "ok") },
    deploys: deploys.map(mapOpsBoot),
    issues,
    logs,
    metrics,
    activity,
    alerts,
    dependencies,
    endpoints,
  };
  const tiles = [...builtInTiles({ ...parts, summary: summaryCounts }, expectAlerting), ...productTiles];
  // One list drives needs_attention, the Overview's status line and the
  // sidebar badge, so they can't disagree with each other or with Issues.
  const attention = attentionItems({ ...parts, tiles, summary: summaryCounts }, expectAlerting);
  void newSevereTemplates;
  const digest: OpsDigest = {
    ...parts,
    summary: { needs_attention: attention.length > 0, attention, ...summaryCounts },
    tiles,
    process: processInfo,
  };
  const response: OpsResponseBody["getOpsDigest"][200] = { digest };
  res.status(200).json(response);
});
