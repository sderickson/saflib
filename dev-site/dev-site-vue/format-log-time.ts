/**
 * Compact wall-clock time for a workflow log's `created_at` — shown
 * right-aligned on the entry's channel header. Local timezone; no date
 * (runs are usually watched live within a single session).
 */
export function formatLogTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}
