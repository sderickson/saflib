import client from "prom-client";

function counter(name: string, help: string, labelNames: string[]) {
  const existing = client.register.getSingleMetric(name);
  return (
    (existing as client.Counter<string> | undefined) ??
    new client.Counter({ name, help, labelNames })
  );
}

/** Lines persisted, by level. */
export const logsWritten = counter("saf_logs_written_total", "Log lines persisted", ["level"]);

/** Lines not persisted: queue full, logged during a flush, or a failed write. */
export const logsDropped = counter("saf_logs_dropped_total", "Log lines not persisted", ["reason"]);

/** Values masked by redaction, by kind. Each one is a log call to fix. */
export const logRedactions = counter(
  "saf_log_redactions_total",
  "Values masked in persisted logs",
  ["kind"],
);

/** Lines removed by retention, by reason (age or size). */
export const logsPruned = counter("saf_logs_pruned_total", "Log lines removed by retention", [
  "reason",
]);
