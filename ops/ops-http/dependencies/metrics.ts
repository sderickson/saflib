import client from "prom-client";
import type { DbKey } from "@saflib/drizzle";
import { latestDependencies } from "../routes/get-ops-dependencies.ts";
import type { AcceptedAdvisory } from "./accepted.ts";

/** Get-or-create, so creating the router twice (tests) doesn't throw. */
function gauge(name: string, help: string, labelNames: string[], collect: (g: client.Gauge<string>) => Promise<void>) {
  const existing = client.register.getSingleMetric(name);
  if (existing) client.register.removeSingleMetric(name);
  return new client.Gauge({
    name,
    help,
    labelNames,
    async collect() {
      await collect(this);
    },
  });
}

/**
 * The latest dependency report as metrics, so the alert rules (and the email
 * notifier behind them) see it, not just the digest:
 *
 * - `saf_dependency_advisories{severity}`: open advisories; accepted ones are
 *   counted under `severity="accepted"` instead of their own severity.
 * - `saf_dependency_runtime_eol_soon`: runtime components (Node, base OS) past
 *   or within 90 days of end of life.
 * - `saf_dependency_check_timestamp_seconds`: when the last check finished.
 *
 * Nothing is exported until the first check finishes.
 */
export function registerDependencyMetrics(dbKey: DbKey, accepted: AcceptedAdvisory[]) {
  let cache: { at: number; report: Awaited<ReturnType<typeof latestDependencies>> } | undefined;
  // One read serves the three gauges of a scrape.
  const latest = async () => {
    if (!cache || Date.now() - cache.at > 10_000) {
      cache = { at: Date.now(), report: await latestDependencies(dbKey, new Date(), accepted).catch(() => null) };
    }
    return cache.report;
  };

  gauge("saf_dependency_advisories", "Open advisories in the deployed packages, by severity (accepted ones as severity=accepted)", ["severity"], async (g) => {
    g.reset();
    const r = await latest();
    if (!r) return;
    const counts: Record<string, number> = { critical: 0, high: 0, moderate: 0, low: 0, unknown: 0, accepted: 0 };
    for (const a of r.advisories) counts[a.accepted ? "accepted" : a.severity]! += 1;
    for (const [severity, n] of Object.entries(counts)) g.set({ severity }, n);
  });
  gauge("saf_dependency_runtime_eol_soon", "Runtime components (Node, base OS) past or within 90 days of end of life", [], async (g) => {
    g.reset();
    const r = await latest();
    if (r) g.set(r.runtime.filter((c) => c.eol_soon).length);
  });
  gauge("saf_dependency_check_timestamp_seconds", "When the last dependency check finished", [], async (g) => {
    g.reset();
    const r = await latest();
    if (r) g.set(Date.parse(r.checked_at) / 1000);
  });
}
