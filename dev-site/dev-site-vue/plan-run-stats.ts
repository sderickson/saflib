/** Clock time for a workflow run, from its row's created/updated timestamps. */
export interface RunTiming {
  created_at: string;
  updated_at: string;
  status: string;
}

export interface ClockSummary {
  start: Date;
  /** Absent while the run (or any run in the set) is still pending or running. */
  end?: Date;
  durationMs: number;
}

const IN_PROGRESS = new Set(["pending", "running"]);

/** Earliest start through latest stop. In-progress runs have no end; duration runs up to `now`. */
export function summarizeRunTimings(runs: RunTiming[], now: Date): ClockSummary | undefined {
  if (runs.length === 0) return undefined;
  const startMs = Math.min(...runs.map((run) => Date.parse(run.created_at)));
  const inProgress = runs.some((run) => IN_PROGRESS.has(run.status));
  const end = inProgress
    ? undefined
    : new Date(Math.max(...runs.map((run) => Date.parse(run.updated_at))));
  return {
    start: new Date(startMs),
    end,
    durationMs: (end?.getTime() ?? now.getTime()) - startMs,
  };
}

export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem ? `${hours}h ${rem}m` : `${hours}h`;
}

function formatStamp(date: Date, other: Date | undefined): string {
  const sameDay = other !== undefined && date.toDateString() === other.toDateString();
  if (sameDay && other !== undefined && date.getTime() >= other.getTime()) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Sep 21, 2:14 PM – 4:02 PM · 1h 48m", or a start and elapsed time when still running. */
export function formatClockSummary(summary: ClockSummary): string {
  const duration = formatDuration(summary.durationMs);
  const start = formatStamp(summary.start, summary.end);
  if (!summary.end) return `${start} · ${duration}`;
  const end = formatStamp(summary.end, summary.start);
  return `${start} – ${end} · ${duration}`;
}
