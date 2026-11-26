import type { OpsLogGroupResponse } from "@saflib/ops-spec";

/** ShortId prefix for a context kind: r request, j job, c cron tick, p process. */
export const contextPrefix = (kind: string | null | undefined) =>
  ({ request: "r", job: "j", cron: "c", process: "p" })[kind ?? ""] ?? undefined;

/** Chip label for a group's kind; requests show their method. */
export function groupKindLabel(g: OpsLogGroupResponse): string {
  if (g.kind === "request") return g.request?.method ?? "REQ";
  return ({ job: "JOB", cron: "CRON", process: "START" })[g.kind ?? ""] ?? "LOG";
}

/** What a group is: method and route, job or cron name, or its first line. */
export function groupTitle(g: OpsLogGroupResponse): string {
  if (g.kind === "request" && g.request?.route) return g.request.route;
  if ((g.kind === "job" || g.kind === "cron") && g.operation_name) return g.operation_name;
  if (g.kind === "process") return `${g.service_name ?? "process"} startup`;
  return g.untrusted.first_message;
}

export type Tone = "success" | "warning" | "error" | undefined;

/** Outcome chip: HTTP status for requests, else how the lines went. */
export function groupStatus(g: OpsLogGroupResponse): { label: string; tone: Tone } {
  const status = g.request?.status;
  if (status != null) {
    return { label: String(status), tone: status >= 500 ? "error" : status >= 400 ? "warning" : "success" };
  }
  if (g.kind === null) {
    return { label: g.errors ? "error" : g.warnings ? "warn" : "info", tone: g.errors ? "error" : g.warnings ? "warning" : undefined };
  }
  if (g.errors) return { label: "failed", tone: "error" };
  if (g.warnings) return { label: "warnings", tone: "warning" };
  return { label: g.kind === "process" ? "ready" : "done", tone: undefined };
}

/** "42 ms", "1.8 s", "3 min". */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.round(ms / 60_000)} min`;
}

export function groupDuration(g: OpsLogGroupResponse): string {
  if (g.request?.duration_ms != null) return formatDuration(g.request.duration_ms);
  if (g.kind === null) return "";
  return formatDuration(new Date(g.last_ts).getTime() - new Date(g.first_ts).getTime());
}

/** Offset of a line from its group's start: "+0", "+6 ms", "+3.0 s". */
export function formatOffset(ts: string, start: string): string {
  const ms = new Date(ts).getTime() - new Date(start).getTime();
  return ms <= 0 ? "+0" : `+${formatDuration(ms)}`;
}

/** Errors and warnings start open, so problems show without a click. */
export const startsOpen = (g: OpsLogGroupResponse) => g.kind !== null && (g.errors > 0 || g.warnings > 0);

export const levelColor = (level: string) =>
  ({ error: "error", warn: "warning" })[level] ?? undefined;

/** "{ key1, key2 }": what a collapsed fields object shows. */
export function fieldKeysSummary(fields: unknown): string {
  if (fields === null || typeof fields !== "object" || Array.isArray(fields)) return "{ … }";
  const keys = Object.keys(fields);
  return keys.length === 0 ? "{}" : `{ ${keys.join(", ")} }`;
}

export const formatTime = (ts: string) =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(ts));

export const formatDay = (ts: string) =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(ts));
