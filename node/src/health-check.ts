/**
 * Health check contract shared by every suite. Suites export checks (e.g.
 * audit rotation, dead jobs); the ops API (`@saflib/ops-http`) runs them for
 * `GET /ops/health`. Defined here, at the bottom layer, so suites don't
 * depend on the ops packages.
 */
export type HealthStatus = "ok" | "warn" | "fail";

/** What a check reports. Keep `summary` to one line. */
export interface HealthCheckOutcome {
  status: HealthStatus;
  summary: string;
  observed?: Record<string, number | string | boolean | null>;
}

export interface HealthCheck {
  /** Stable identifier, e.g. `disk`, `db`, `audit-rotation`. */
  name: string;
  run: () => Promise<HealthCheckOutcome>;
  /** Default 2000ms. A check that times out reports `fail`. */
  timeoutMs?: number;
}
