import type { OpsHealth, OpsHealthCheck } from "@saflib/ops-spec";
import type { HealthCheck, HealthStatus } from "./types.ts";

const SEVERITY: Record<HealthStatus, number> = { ok: 0, warn: 1, fail: 2 };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

async function runOne(check: HealthCheck): Promise<OpsHealthCheck> {
  const start = performance.now();
  try {
    const outcome = await withTimeout(check.run(), check.timeoutMs ?? 2000);
    return {
      name: check.name,
      ...outcome,
      duration_ms: Math.round(performance.now() - start),
    };
  } catch (e) {
    return {
      name: check.name,
      status: "fail",
      // Error text comes from our own code paths, but keep it short.
      summary: `check errored: ${String(e instanceof Error ? e.message : e).slice(0, 200)}`,
      duration_ms: Math.round(performance.now() - start),
    };
  }
}

/** Run every check concurrently; overall status is the worst one. */
export async function runHealthChecks(checks: HealthCheck[]): Promise<OpsHealth> {
  const results = await Promise.all(checks.map(runOne));
  const status = results.reduce<HealthStatus>(
    (worst, r) => (SEVERITY[r.status] > SEVERITY[worst] ? r.status : worst),
    "ok",
  );
  return { status, checked_at: new Date().toISOString(), checks: results };
}
