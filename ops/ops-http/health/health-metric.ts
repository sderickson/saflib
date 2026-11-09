import client from "prom-client";
import { runHealthChecks } from "./run-health-checks.ts";
import type { HealthCheck } from "./types.ts";

const STATUS_VALUE = { ok: 0, warn: 1, fail: 2 } as const;

let checks: HealthCheck[] = [];

/**
 * `saf_health_check_status{check}`: 0 ok, 1 warn, 2 fail, computed when
 * Prometheus scrapes (each check with its usual timeout). Makes every health
 * check alertable, e.g. audit rotation or Kratos readiness.
 * The latest router's checks win (one router per process in production).
 */
export function registerHealthCheckMetric(healthChecks: HealthCheck[]): void {
  checks = healthChecks;
  if (client.register.getSingleMetric("saf_health_check_status")) return;
  new client.Gauge({
    name: "saf_health_check_status",
    help: "Health check status (0 ok, 1 warn, 2 fail), evaluated at scrape time",
    labelNames: ["check"],
    async collect() {
      this.reset();
      const result = await runHealthChecks(checks);
      for (const c of result.checks) this.set({ check: c.name }, STATUS_VALUE[c.status]);
    },
  });
}
