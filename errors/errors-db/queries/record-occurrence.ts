import type { DbKey } from "@saflib/drizzle";
import { generateShortId } from "@saflib/utils";
import { redactLogEntry, redactString } from "@saflib/utils/redact";
import { issuesDbManager } from "../instances.ts";
import type { IssueGroup, IssueLevel, IssueStatus } from "../schema.ts";
import { computeFingerprint, errorNameFromStack } from "../fingerprint.ts";
import { issueNewGroupsTotal, issueOccurrencesTotal, issueRegressionsTotal } from "../metrics.ts";

/** Occurrences kept per issue (newest). */
export const OCCURRENCES_PER_ISSUE = 20;
const MAX_MESSAGE = 2000;
const MAX_STACK = 8000;
const MAX_FIELDS = 8000;
const HOUR_MS = 3_600_000;

export interface RecordOccurrenceInput {
  level: IssueLevel;
  kind: string;
  message: string;
  stack?: string;
  errorName?: string;
  /** Explicit grouping key (see `ErrorReportOptions.fingerprint`). */
  fingerprint?: string;
  serviceName: string | null;
  operationName?: string | null;
  requestId?: string | null;
  fields?: Record<string, unknown>;
  /** Build that produced it, e.g. a commit. */
  version?: string | null;
  ts?: Date;
}

export interface RecordOccurrenceResult {
  group: IssueGroup;
  occurrenceId: number;
  isNew: boolean;
  regressed: boolean;
}

interface GroupRow extends Omit<IssueGroup, "first_seen" | "last_seen" | "status_changed_at" | "ignored_until"> {
  first_seen: number;
  last_seen: number;
  status_changed_at: number | null;
  ignored_until: number | null;
}

export function toGroup(r: GroupRow): IssueGroup {
  return {
    ...r,
    first_seen: new Date(r.first_seen),
    last_seen: new Date(r.last_seen),
    status_changed_at: r.status_changed_at === null ? null : new Date(r.status_changed_at),
    ignored_until: r.ignored_until === null ? null : new Date(r.ignored_until),
  };
}

function capJson(fields: Record<string, unknown> | undefined): string | null {
  if (!fields || Object.keys(fields).length === 0) return null;
  const json = JSON.stringify(fields, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  return json.length <= MAX_FIELDS
    ? json
    : JSON.stringify({ _truncated: true, preview: json.slice(0, MAX_FIELDS - 100) });
}

/**
 * Record one occurrence: redact it, find or create its issue, apply status
 * transitions (resolved → regressed; expired ignore → open), keep the newest
 * occurrences, and bump the hourly count. Synchronous (one transaction) so
 * error collectors can call it inline. Never logs.
 */
export function recordOccurrence(dbKey: DbKey, input: RecordOccurrenceInput): RecordOccurrenceResult {
  const client = issuesDbManager.get(dbKey)!.$client;
  const now = (input.ts ?? new Date()).getTime();
  const redacted = redactLogEntry({ message: input.message.slice(0, MAX_MESSAGE), fields: input.fields });
  const stack = input.stack ? redactString(input.stack.slice(0, MAX_STACK), "stack").value : null;
  const message = redacted.value.message;
  const fingerprint = computeFingerprint({
    serviceName: input.serviceName,
    fingerprint: input.fingerprint,
    errorName: input.errorName ?? (stack ? errorNameFromStack(stack) : undefined),
    stack: stack ?? undefined,
    message,
  });

  const run = client.transaction(() => {
    const existing = client
      .prepare(`SELECT * FROM issue_groups WHERE fingerprint = ?`)
      .get(fingerprint) as GroupRow | undefined;
    let groupId: string;
    let isNew = false;
    let regressed = false;
    if (!existing) {
      isNew = true;
      groupId = generateShortId();
      client
        .prepare(
          `INSERT INTO issue_groups (id, fingerprint, level, kind, title, service_name, operation_name, first_seen, last_seen, count, first_seen_version, last_seen_version, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'open')`,
        )
        .run(
          groupId,
          fingerprint,
          input.level,
          input.kind,
          (message.split("\n")[0] ?? "").slice(0, 200),
          input.serviceName,
          input.operationName ?? null,
          now,
          now,
          input.version ?? null,
          input.version ?? null,
        );
    } else {
      groupId = existing.id;
      let status: IssueStatus = existing.status;
      let note = existing.status_note;
      let changedAt = existing.status_changed_at;
      let changedBy = existing.status_changed_by;
      if (existing.status === "resolved") {
        status = "regressed";
        regressed = true;
      } else if (existing.status === "ignored" && existing.ignored_until !== null && existing.ignored_until <= now) {
        status = "open";
      }
      if (status !== existing.status) {
        note = regressed ? "seen again after being resolved" : "ignore period ended";
        changedAt = now;
        changedBy = "system";
      }
      // Escalate the level if a worse occurrence shows up (warn → error).
      const levels = ["warn", "error", "fatal"];
      const level =
        levels.indexOf(input.level) > levels.indexOf(existing.level) ? input.level : existing.level;
      client
        .prepare(
          `UPDATE issue_groups SET last_seen = MAX(last_seen, ?), count = count + 1, last_seen_version = COALESCE(?, last_seen_version),
             level = ?, status = ?, status_note = ?, status_changed_at = ?, status_changed_by = ? WHERE id = ?`,
        )
        .run(now, input.version ?? null, level, status, note, changedAt, changedBy, groupId);
    }

    const occurrenceId = Number(
      client
        .prepare(
          `INSERT INTO issue_occurrences (group_id, ts, request_id, message, stack, fields, version) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(groupId, now, input.requestId ?? null, message, stack, capJson(redacted.value.fields), input.version ?? null)
        .lastInsertRowid,
    );
    client
      .prepare(
        `DELETE FROM issue_occurrences WHERE group_id = ? AND id NOT IN (SELECT id FROM issue_occurrences WHERE group_id = ? ORDER BY id DESC LIMIT ${OCCURRENCES_PER_ISSUE})`,
      )
      .run(groupId, groupId);
    client
      .prepare(
        `INSERT INTO issue_hourly_counts (group_id, hour, count) VALUES (?, ?, 1)
         ON CONFLICT(group_id, hour) DO UPDATE SET count = count + 1`,
      )
      .run(groupId, Math.floor(now / HOUR_MS) * HOUR_MS);

    const group = toGroup(client.prepare(`SELECT * FROM issue_groups WHERE id = ?`).get(groupId) as GroupRow);
    return { group, occurrenceId, isNew, regressed };
  });

  const result = run.immediate();
  issueOccurrencesTotal.inc({ level: input.level, kind: input.kind });
  if (result.isNew) issueNewGroupsTotal.inc({ level: input.level, kind: input.kind });
  if (result.regressed) issueRegressionsTotal.inc({ level: result.group.level });
  return result;
}
