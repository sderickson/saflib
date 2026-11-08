import type { DbKey } from "@saflib/drizzle";
import { recordOccurrence } from "./queries/record-occurrence.ts";

/** Shape of `@saflib/node-log-db`'s `onRedaction` event (kept structural to avoid the dependency). */
export interface RedactionEventLike {
  detections: Array<{ kind: string; where: string }>;
  templateHash: string;
  template: string;
  serviceName: string | null;
  operationName: string | null;
}

/**
 * Turns log redactions into `warn` issues (`log.redaction:<kind>:<template>`)
 * so a log call that leaks secrets or PII gets fixed. Throttled per issue
 * (default once a minute), since a leaking call usually fires on every
 * request. Pass the result as the persistent log transport's `onRedaction`.
 */
export function createRedactionIssueRecorder(options: {
  getDbKey: () => DbKey;
  minIntervalMs?: number;
  version?: string | null;
}) {
  const minInterval = options.minIntervalMs ?? 60_000;
  const lastRecorded = new Map<string, number>();
  return (event: RedactionEventLike) => {
    const now = Date.now();
    const byKind = new Map<string, string[]>();
    for (const d of event.detections) byKind.set(d.kind, [...(byKind.get(d.kind) ?? []), d.where]);
    for (const [kind, where] of byKind) {
      const fingerprint = `log.redaction:${kind}:${event.templateHash}`;
      const last = lastRecorded.get(fingerprint);
      if (last !== undefined && now - last < minInterval) continue;
      lastRecorded.set(fingerprint, now);
      try {
        recordOccurrence(options.getDbKey(), {
          level: "warn",
          kind: "redaction",
          fingerprint,
          message: `Log line leaks ${kind} (masked): ${event.template}`,
          serviceName: event.serviceName,
          operationName: event.operationName,
          fields: { where },
          version: options.version ?? null,
        });
      } catch (e) {
        console.error("errors-db: could not record redaction issue", e);
      }
    }
  };
}
