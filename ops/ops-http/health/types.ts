export type HealthStatus = "ok" | "warn" | "fail";

/** What a check reports. Keep `summary` to one line. */
export interface HealthCheckOutcome {
  status: HealthStatus;
  summary: string;
  observed?: Record<string, number | string | boolean | null>;
}

/**
 * One health check. Suites and products register these; `GET /ops/health`
 * runs them all, each with a timeout.
 */
export interface HealthCheck {
  /** Stable identifier, e.g. `disk`, `db`, `audit-rotation`. */
  name: string;
  run: () => Promise<HealthCheckOutcome>;
  /** Default 2000ms. A check that times out reports `fail`. */
  timeoutMs?: number;
}
