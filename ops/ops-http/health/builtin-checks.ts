import { statfs } from "node:fs/promises";
import { monitorEventLoopDelay } from "node:perf_hooks";
import { getHeapStatistics } from "node:v8";
import { kratosAdminBaseUrl } from "@saflib/express";
import type { HealthCheck, HealthCheckOutcome, HealthStatus } from "./types.ts";

const MB = 1024 * 1024;

/**
 * Free space on the filesystem holding `path` (typically the data volume).
 * Duplicates node_exporter on purpose: it's the app's own view, and it works
 * before Prometheus is set up.
 */
export function diskCheck(options: {
  path: string;
  /** Warn below this free fraction. Default 0.2. */
  warnFreeRatio?: number;
  /** Fail below this free fraction. Default 0.1. */
  failFreeRatio?: number;
}): HealthCheck {
  const warn = options.warnFreeRatio ?? 0.2;
  const fail = options.failFreeRatio ?? 0.1;
  return {
    name: "disk",
    async run(): Promise<HealthCheckOutcome> {
      const s = await statfs(options.path);
      const total = s.blocks * s.bsize;
      const free = s.bavail * s.bsize;
      const ratio = total > 0 ? free / total : 0;
      const status: HealthStatus = ratio < fail ? "fail" : ratio < warn ? "warn" : "ok";
      return {
        status,
        summary: `${Math.round(ratio * 100)}% free (${Math.round(free / MB)} MB of ${Math.round(total / MB)} MB)`,
        observed: { free_bytes: free, total_bytes: total, free_ratio: Number(ratio.toFixed(4)) },
      };
    },
  };
}

/**
 * Process memory against V8's heap limit, plus event loop delay since the
 * previous check (p99).
 */
export function processCheck(options: {
  /** Warn when heap used exceeds this fraction of the limit. Default 0.8. */
  warnHeapRatio?: number;
  /** Warn when event loop p99 delay exceeds this many ms. Default 200. */
  warnLoopDelayMs?: number;
} = {}): HealthCheck {
  const warnHeap = options.warnHeapRatio ?? 0.8;
  const warnLoop = options.warnLoopDelayMs ?? 200;
  const histogram = monitorEventLoopDelay({ resolution: 20 });
  histogram.enable();
  return {
    name: "process",
    async run(): Promise<HealthCheckOutcome> {
      const mem = process.memoryUsage();
      const heapLimit = getHeapStatistics().heap_size_limit;
      const heapRatio = heapLimit > 0 ? mem.heapUsed / heapLimit : 0;
      const loopP99Ms = histogram.percentile(99) / 1e6;
      histogram.reset();
      const problems: string[] = [];
      if (heapRatio > warnHeap) problems.push(`heap at ${Math.round(heapRatio * 100)}% of limit`);
      if (loopP99Ms > warnLoop) problems.push(`event loop p99 ${Math.round(loopP99Ms)}ms`);
      return {
        status: problems.length > 0 ? "warn" : "ok",
        summary:
          problems.join("; ") ||
          `rss ${Math.round(mem.rss / MB)} MB, heap ${Math.round(heapRatio * 100)}% of limit, up ${Math.round(process.uptime())}s`,
        observed: {
          rss_bytes: mem.rss,
          heap_used_bytes: mem.heapUsed,
          heap_limit_bytes: heapLimit,
          event_loop_p99_ms: Number(loopP99Ms.toFixed(1)),
          uptime_seconds: Math.round(process.uptime()),
        },
      };
    },
  };
}

/**
 * Wrap a boolean-ish probe (e.g. `SELECT 1` against a database) as a check.
 * The probe throwing or returning `false` reports `fail`.
 */
export function probeCheck(name: string, probe: () => Promise<boolean | void>): HealthCheck {
  return {
    name,
    async run(): Promise<HealthCheckOutcome> {
      const ok = await probe();
      return ok === false
        ? { status: "fail", summary: `${name} probe returned false` }
        : { status: "ok", summary: `${name} reachable` };
    },
  };
}

/**
 * Kratos readiness (`GET <admin>/health/ready`). Products authenticate through
 * Kratos, so the service is not healthy for users when Kratos is down even if
 * its own process is. `baseUrl` defaults to `KRATOS_ADMIN_API_URL`
 * (`http://kratos:4434`).
 */
export function kratosCheck(options: { baseUrl?: string } = {}): HealthCheck {
  return {
    name: "kratos",
    async run(): Promise<HealthCheckOutcome> {
      const base = (options.baseUrl ?? kratosAdminBaseUrl()).replace(/\/+$/, "");
      try {
        const res = await fetch(`${base}/health/ready`);
        return res.ok
          ? { status: "ok", summary: "kratos ready" }
          : { status: "fail", summary: `kratos not ready (HTTP ${res.status})` };
      } catch (e) {
        return { status: "fail", summary: `kratos unreachable: ${e instanceof Error ? e.message : String(e)}` };
      }
    },
  };
}
