import type { DbKey } from "@saflib/drizzle";
import { getSafReporters } from "@saflib/node";
import { findOccurrenceContaining } from "@saflib/errors-db";
import { listLogs } from "@saflib/node-log-db";
import { listAlerts } from "@saflib/ops-db";
import { throwError } from "@saflib/utils";
import type { OpsDiagnosticProbe } from "@saflib/ops-spec";

export type DiagnosticRef = { kind: "issue" | "log" | "job" | "audit" | "alert"; id: string };
export type DiagnosticFound = { at: Date; ref: DiagnosticRef | null } | null;

/**
 * One observability self-test. Server probes send their signal in `run`;
 * client probes are fired by the browser. `find` looks for the run's tagged
 * signal where it should land. Products add probes (jobs, audit) through
 * `OpsRouterOptions.diagnosticProbes`.
 */
export interface DiagnosticProbe {
  id: string;
  side: OpsDiagnosticProbe["side"];
  label: string;
  what: string;
  destination: string;
  link: OpsDiagnosticProbe["link"];
  /** Why it can't run here, or null. */
  skipReason?: () => string | null | Promise<string | null>;
  /**
   * Send the signal. Return a ref when the signal can't carry the tag
   * itself (e.g. a job id), and `find` gets it back as `remembered`.
   */
  run?: (ctx: { runId: string; tag: string }) => Promise<DiagnosticRef | void>;
  find: (ctx: { runId: string; since: Date; remembered?: DiagnosticRef }) => Promise<DiagnosticFound>;
}

/** The tag every signal of a run carries. */
export const diagTag = (runId: string, probeId: string) => `[diag:${runId}] ${probeId}`;

interface BuiltInContext {
  dbKey: DbKey;
  issuesDbKey?: DbKey;
  logsDbKey?: DbKey;
  metricsEnabled: boolean;
  alertmanagerUrl?: string;
  saf_app?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The probes the ops API can run and check by itself. */
export function builtInProbes(ctx: BuiltInContext): DiagnosticProbe[] {
  /** Issues finder for one probe's signal; the needle defaults to its tag. */
  const inIssues =
    (probeId: string, needle: (runId: string) => string = (runId) => diagTag(runId, probeId)) =>
    async ({ runId, since }: { runId: string; since: Date }): Promise<DiagnosticFound> => {
      if (!ctx.issuesDbKey) return null;
      const found = findOccurrenceContaining(ctx.issuesDbKey, needle(runId), since);
      return found ? { at: found.ts, ref: { kind: "issue", id: found.groupId } } : null;
    };
  const inLogs = (probeId: string) => async ({ runId, since }: { runId: string; since: Date }): Promise<DiagnosticFound> => {
    if (!ctx.logsDbKey) return null;
    const { entries } = await throwError(listLogs(ctx.logsDbKey, { q: `${runId} ${probeId}`, since, limit: 1 }));
    const line = entries[0];
    return line ? { at: line.ts, ref: { kind: "log", id: line.context_id ?? String(line.id) } } : null;
  };
  const needsIssues = () => (ctx.issuesDbKey ? null : "Issues aren't enabled here");
  const needsLogs = () => (ctx.logsDbKey ? null : "Persisted logs aren't enabled here");

  return [
    {
      id: "client-vue",
      side: "client",
      label: "Vue component error",
      what: "Throws an error while rendering a component",
      destination: "Issues",
      link: "issues",
      skipReason: needsIssues,
      find: inIssues("client-vue"),
    },
    {
      id: "client-promise",
      side: "client",
      label: "Unhandled rejection",
      what: "Rejects a promise nobody handles",
      destination: "Issues",
      link: "issues",
      skipReason: needsIssues,
      find: inIssues("client-promise"),
    },
    {
      id: "client-csp",
      side: "client",
      label: "CSP violation",
      what: "Loads an image the Content Security Policy blocks",
      destination: "Issues",
      link: "issues",
      skipReason: needsIssues,
      // The blocked URL carries the run: https://diag-<runId>.invalid/…
      find: inIssues("client-csp", (runId) => `diag-${runId}.invalid`),
    },
    {
      id: "server-500",
      side: "server",
      label: "Server error",
      what: "An endpoint throws and answers 500",
      destination: "Issues",
      link: "issues",
      skipReason: needsIssues,
      async run({ tag }) {
        throw new Error(`${tag}: thrown on purpose`);
      },
      find: inIssues("server-500"),
    },
    {
      id: "server-warn-log",
      side: "server",
      label: "Warning log line",
      what: "Logs a warning",
      destination: "Server logs",
      link: "logs",
      skipReason: needsLogs,
      async run({ tag }) {
        getSafReporters().log.warn(`${tag}: logged on purpose`);
      },
      find: inLogs("server-warn-log"),
    },
    {
      id: "slow-request",
      side: "server",
      label: "Slow request",
      what: "Takes 2 seconds to answer, for the p95 graph",
      destination: "Metrics (p95) and Server logs",
      link: "metrics",
      skipReason: () => (!ctx.metricsEnabled ? "Needs Prometheus" : needsLogs()),
      async run({ tag }) {
        await sleep(2000);
        getSafReporters().log.info(`${tag}: answered after 2s`);
      },
      find: inLogs("slow-request"),
    },
    {
      id: "test-alert",
      side: "server",
      label: "Test alert",
      what: "Fires an info alert through Alertmanager (never pages anyone)",
      destination: "Alerts",
      link: "alerts",
      skipReason: () => (ctx.alertmanagerUrl ? null : "Needs Alertmanager (ALERTMANAGER_URL)"),
      async run({ runId, tag }) {
        const now = Date.now();
        const res = await fetch(`${ctx.alertmanagerUrl!.replace(/\/+$/, "")}/api/v2/alerts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([
            {
              labels: {
                alertname: "SafDiagnosticsTest",
                severity: "info",
                saf_diagnostics: runId,
                ...(ctx.saf_app ? { saf_app: ctx.saf_app } : {}),
              },
              annotations: { summary: `${tag}: test alert` },
              startsAt: new Date(now).toISOString(),
              endsAt: new Date(now + 5 * 60_000).toISOString(),
            },
          ]),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error(`Alertmanager answered ${res.status}`);
      },
      async find({ runId, since }) {
        const alerts = await throwError(listAlerts(ctx.dbKey, { alertnames: ["SafDiagnosticsTest"], limit: 50 }));
        const hit = alerts.find((a) => {
          try {
            return (JSON.parse(a.labels) as Record<string, unknown>).saf_diagnostics === runId && a.last_received_at >= since;
          } catch {
            return false;
          }
        });
        return hit ? { at: hit.last_received_at, ref: { kind: "alert", id: hit.id } } : null;
      },
    },
  ];
}

/** What server probes triggered per run, for probes whose signal can't carry the tag. */
export class RunRegistry {
  private runs = new Map<string, { at: number; refs: Map<string, DiagnosticRef> }>();
  private readonly ttlMs: number;
  // No parameter properties: the dev stack runs this with Node's type stripping.
  constructor(ttlMs = 2 * 3_600_000) {
    this.ttlMs = ttlMs;
  }

  remember(runId: string, probeId: string, ref: DiagnosticRef) {
    this.prune();
    const run = this.runs.get(runId) ?? { at: Date.now(), refs: new Map() };
    run.refs.set(probeId, ref);
    this.runs.set(runId, run);
  }

  recall(runId: string, probeId: string): DiagnosticRef | undefined {
    return this.runs.get(runId)?.refs.get(probeId);
  }

  private prune() {
    const cutoff = Date.now() - this.ttlMs;
    for (const [id, run] of this.runs) if (run.at < cutoff) this.runs.delete(id);
  }
}
