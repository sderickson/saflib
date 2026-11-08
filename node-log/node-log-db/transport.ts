import TransportStream from "winston-transport";
import type { TransformableInfo } from "logform";
import type { DbKey } from "@saflib/drizzle";
import {
  redactLogEntry,
  type RedactOptions,
  type RedactionDetection,
} from "@saflib/utils/redact";
import { logsDbManager } from "./instances.ts";
import { logLevels } from "./schema.ts";
import { normalizeTemplate, templateHash } from "./templates.ts";
import { logRedactions, logsDropped, logsWritten } from "./metrics.ts";
import { pruneLogs, type RetentionOptions } from "./retention.ts";

const SPLAT = Symbol.for("splat");
const MAX_MESSAGE_CHARS = 4000;
const MAX_FIELDS_CHARS = 8000;

/** Keys the SAF logger sets itself; everything else on `info` is a field. */
const CONTEXT_KEYS = new Set([
  "level",
  "message",
  "timestamp",
  "service_name",
  "subsystem_name",
  "operation_name",
  "request_id",
  "user_id",
  "splat",
]);

export interface RedactionEvent {
  detections: RedactionDetection[];
  /** Template of the (redacted) message, for grouping the follow-up issue. */
  templateHash: string;
  template: string;
  serviceName: string | null;
  operationName: string | null;
}

export interface PersistentLogTransportOptions {
  getDbKey: () => DbKey;
  /** Least severe level persisted. Default `info`. */
  minLevel?: (typeof logLevels)[number];
  /** Default 1000ms. */
  flushIntervalMs?: number;
  /** Lines held in memory before new ones are dropped. Default 10,000. */
  maxQueue?: number;
  redact?: RedactOptions;
  /**
   * Called for each line where redaction masked something, so the caller can
   * raise an issue to fix the log call. Must not throw or log synchronously
   * through this transport.
   */
  onRedaction?: (event: RedactionEvent) => void;
  /** Retention limits, applied every `retentionIntervalMs` (default 10 min). */
  retention?: RetentionOptions;
  retentionIntervalMs?: number;
}

interface PendingEntry {
  ts: number;
  level: string;
  level_num: number;
  service_name: string | null;
  subsystem_name: string | null;
  operation_name: string | null;
  request_id: string | null;
  user_id: string | null;
  template_hash: string;
  template: string;
  message: string;
  fields: string | null;
  redactions: number;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" && v !== "-" ? v : null;
}

function extractFields(info: TransformableInfo): Record<string, unknown> | undefined {
  const splat = (info as Record<symbol, unknown>)[SPLAT];
  if (Array.isArray(splat) && splat.length > 0) {
    const first = splat.length === 1 ? splat[0] : { args: splat };
    if (first && typeof first === "object" && !Array.isArray(first)) {
      return first as Record<string, unknown>;
    }
    return { value: first };
  }
  const rest: Record<string, unknown> = {};
  let found = false;
  for (const key of Object.keys(info)) {
    if (CONTEXT_KEYS.has(key)) continue;
    rest[key] = (info as Record<string, unknown>)[key];
    found = true;
  }
  return found ? rest : undefined;
}

function serializeFields(fields: Record<string, unknown> | undefined): string | null {
  if (!fields || Object.keys(fields).length === 0) return null;
  const json = JSON.stringify(fields, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  if (json.length <= MAX_FIELDS_CHARS) return json;
  return JSON.stringify({ _truncated: true, preview: json.slice(0, MAX_FIELDS_CHARS - 100) });
}

/**
 * Winston transport that persists redacted log lines to `node-log-db`.
 * Never blocks or fails the caller: lines are queued and written in batches
 * on a timer; when the queue is full, new lines are dropped and counted.
 */
export class PersistentLogTransport extends TransportStream {
  private readonly options: PersistentLogTransportOptions;
  private readonly maxLevelNum: number;
  private queue: PendingEntry[] = [];
  private flushing = false;
  private readonly flushTimer: NodeJS.Timeout;
  private readonly retentionTimer: NodeJS.Timeout;

  constructor(options: PersistentLogTransportOptions) {
    super({ level: options.minLevel ?? "info" });
    this.options = options;
    this.maxLevelNum = logLevels.indexOf(options.minLevel ?? "info");
    this.flushTimer = setInterval(() => this.flush(), options.flushIntervalMs ?? 1000);
    this.flushTimer.unref();
    this.retentionTimer = setInterval(
      () => this.applyRetention(),
      options.retentionIntervalMs ?? 10 * 60_000,
    );
    this.retentionTimer.unref();
  }

  override log(info: TransformableInfo, callback: () => void): void {
    try {
      this.enqueue(info);
    } catch (e) {
      // Never throw into the caller's log statement.
      logsDropped.inc({ reason: "error" });
      console.error("node-log-db: could not queue log line", e);
    }
    callback();
  }

  private enqueue(info: TransformableInfo) {
    if (this.flushing) {
      // Logged synchronously by our own write path; persisting it could loop.
      logsDropped.inc({ reason: "reentrant" });
      return;
    }
    const levelNum = logLevels.indexOf(info.level as (typeof logLevels)[number]);
    if (levelNum < 0 || levelNum > this.maxLevelNum) return;
    if (this.queue.length >= (this.options.maxQueue ?? 10_000)) {
      logsDropped.inc({ reason: "queue_full" });
      return;
    }

    const rawMessage = typeof info.message === "string" ? info.message : String(info.message);
    const redacted = redactLogEntry(
      { message: rawMessage.slice(0, MAX_MESSAGE_CHARS), fields: extractFields(info) },
      this.options.redact,
    );
    const serviceName = str(info.service_name);
    const template = normalizeTemplate(redacted.value.message);
    const hash = templateHash(serviceName, template);

    if (redacted.detections.length > 0) {
      for (const d of redacted.detections) logRedactions.inc({ kind: d.kind });
      try {
        this.options.onRedaction?.({
          detections: redacted.detections,
          templateHash: hash,
          template,
          serviceName,
          operationName: str(info.operation_name),
        });
      } catch {
        // The hook is best-effort.
      }
    }

    this.queue.push({
      ts: Date.now(),
      level: info.level,
      level_num: levelNum,
      service_name: serviceName,
      subsystem_name: str(info.subsystem_name),
      operation_name: str(info.operation_name),
      request_id: str(info.request_id),
      user_id: str(info.user_id),
      template_hash: hash,
      template,
      message: redacted.value.message,
      fields: serializeFields(redacted.value.fields),
      redactions: redacted.detections.length,
    });
  }

  /** Write queued lines and update templates in one transaction. Synchronous. */
  flush(): void {
    if (this.queue.length === 0 || this.flushing) return;
    const batch = this.queue;
    this.queue = [];
    this.flushing = true;
    try {
      const client = logsDbManager.get(this.options.getDbKey())!.$client;
      const insertEntry = client.prepare(
        `INSERT INTO log_entries (ts, level, level_num, service_name, subsystem_name, operation_name, request_id, user_id, template_hash, message, fields, redactions)
         VALUES (@ts, @level, @level_num, @service_name, @subsystem_name, @operation_name, @request_id, @user_id, @template_hash, @message, @fields, @redactions)`,
      );
      const upsertTemplate = client.prepare(
        `INSERT INTO log_templates (hash, template, level, service_name, first_seen, last_seen, count)
         VALUES (@hash, @template, @level, @service_name, @ts, @ts, @n)
         ON CONFLICT(hash) DO UPDATE SET last_seen = MAX(last_seen, excluded.last_seen), count = count + excluded.count`,
      );
      const write = client.transaction((entries: PendingEntry[]) => {
        const perTemplate = new Map<string, { e: PendingEntry; n: number; last: number }>();
        for (const e of entries) {
          const { template: _t, ...row } = e;
          insertEntry.run(row);
          const agg = perTemplate.get(e.template_hash);
          if (agg) {
            agg.n += 1;
            agg.last = Math.max(agg.last, e.ts);
          } else {
            perTemplate.set(e.template_hash, { e, n: 1, last: e.ts });
          }
        }
        for (const { e, n, last } of perTemplate.values()) {
          upsertTemplate.run({
            hash: e.template_hash,
            template: e.template,
            level: e.level,
            service_name: e.service_name,
            ts: last,
            n,
          });
        }
      });
      write(batch);
      for (const e of batch) logsWritten.inc({ level: e.level });
    } catch (e) {
      logsDropped.inc({ reason: "write_failed" }, batch.length);
      console.error("node-log-db: failed to write log batch", e);
    } finally {
      this.flushing = false;
    }
  }

  private applyRetention() {
    this.flushing = true;
    try {
      pruneLogs(this.options.getDbKey(), this.options.retention);
    } catch (e) {
      console.error("node-log-db: retention failed", e);
    } finally {
      this.flushing = false;
    }
  }

  override close(): void {
    clearInterval(this.flushTimer);
    clearInterval(this.retentionTimer);
    this.flush();
  }
}

export function createPersistentLogTransport(options: PersistentLogTransportOptions) {
  return new PersistentLogTransport(options);
}
