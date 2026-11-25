import { reportError } from "@saflib/errors-service";
import { createHandler } from "./handler.ts";

function scrubForTelemetry(value: unknown, depth = 0): unknown {
  if (depth > 8) {
    return "[max-depth]";
  }
  if (value === null || typeof value !== "object") {
    if (typeof value === "string" && value.length > 400) {
      return `${value.slice(0, 400)}…`;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 25).map((v) => scrubForTelemetry(v, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = scrubForTelemetry(v, depth + 1);
  }
  return out;
}

function extractCspReports(body: unknown): unknown[] {
  // report-uri: { "csp-report": {...} }. Reporting API (report-to): an array
  // of { type: "csp-violation", body: {...} }.
  if (Array.isArray(body)) {
    return body
      .slice(0, 25)
      .map((r) => (r && typeof r === "object" && "body" in r ? (r as { body: unknown }).body : r));
  }
  if (body && typeof body === "object" && "csp-report" in body) {
    return [(body as { "csp-report": unknown })["csp-report"]];
  }
  return [body];
}

function str(report: unknown, ...keys: string[]): string | undefined {
  if (!report || typeof report !== "object") return undefined;
  for (const k of keys) {
    const v = (report as Record<string, unknown>)[k];
    if (typeof v === "string" && v) return v;
  }
  return undefined;
}

/** Origin of a URL, or the CSP keyword ("inline", "eval", "data") as is. */
function originOf(value: string | undefined): string {
  if (!value) return "unknown";
  try {
    const u = new URL(value);
    return u.origin === "null" ? `${u.protocol}` : u.origin;
  } catch {
    return value.slice(0, 40);
  }
}

function hostOf(value: string | undefined): string {
  if (!value) return "unknown page";
  try {
    return new URL(value).host;
  } catch {
    return "unknown page";
  }
}

/**
 * Title and grouping key for one violation: the directive, what it blocked
 * (origin only, so paths and ids don't split issues) and the page's host.
 */
export function describeCspViolation(report: unknown): { message: string; fingerprint: string } {
  const directive = (
    str(report, "effective-directive", "effectiveDirective", "violated-directive", "violatedDirective") ??
    "unknown-directive"
  ).split(" ")[0]!;
  const blocked = originOf(str(report, "blocked-uri", "blockedURL", "blockedUri"));
  const page = hostOf(str(report, "document-uri", "documentURL", "documentUri"));
  return {
    message: `CSP ${directive} blocked ${blocked} on ${page}`,
    fingerprint: `csp:${directive}:${blocked}:${page}`,
  };
}

export function createPostCspViolationReportHandler() {
  return createHandler(async (req, res) => {
    for (const raw of extractCspReports(req.body)) {
      const { message, fingerprint } = describeCspViolation(raw);
      reportError({
        kind: "csp-violation",
        message,
        fingerprint,
        metadata: { cspReport: scrubForTelemetry(raw) },
        source: "browser",
      });
    }

    res.status(204).end();
  });
}
