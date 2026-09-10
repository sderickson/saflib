import { getErrorService } from "@saflib/errors-service";
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

function extractCspReport(body: unknown): unknown {
  if (body && typeof body === "object" && "csp-report" in body) {
    return (body as { "csp-report": unknown })["csp-report"];
  }
  return body;
}

export function createPostCspViolationReportHandler() {
  return createHandler(async (req, res) => {
    const raw = extractCspReport(req.body);
    const scrubbed = scrubForTelemetry(raw);

    getErrorService().recordReportedError({
      kind: "csp-violation",
      message: "Content-Security-Policy violation",
      metadata: { cspReport: scrubbed },
      source: "browser",
    });

    res.status(204).end();
  });
}
