import { reactive } from "vue";
import type { ScanJob } from "./requests/scan-jobs.ts";

/**
 * Commits whose scan progress is shown inline on the page (the Checkout
 * "scanning this commit" panel). The app bar leaves those jobs out.
 */
export const inlineScanCommits = reactive(new Set<string>());

export interface ScanStatus {
  /** Full line for the app bar, including which commit. */
  label: string;
  /** Phase, counts and step only, for a panel that already names the commit. */
  step: string;
  /** 0–100; ignored when `indeterminate`. */
  percent: number;
  indeterminate: boolean;
}

/**
 * What the app bar shows for the scan queue: the running job's commit,
 * phase and counts, or null when nothing is queued or running.
 */
export function describeScanStatus(jobs: readonly ScanJob[]): ScanStatus | null {
  const running = jobs.find((job) => job.status === "running");
  const queued = jobs.filter((job) => job.status === "queued").length;
  const queuedSuffix = queued > 0 ? ` · ${queued} queued` : "";

  if (!running) {
    if (queued === 0) return null;
    return {
      label: `Scan queued${queued > 1 ? ` (${queued})` : ""}`,
      step: "Queued",
      percent: 0,
      indeterminate: true,
    };
  }

  const p = running.progress;
  if (!p) {
    return {
      label: `Starting scan${queuedSuffix}`,
      step: "Starting",
      percent: 0,
      indeterminate: true,
    };
  }

  const commit =
    p.commit_count > 1
      ? `commit ${p.commit_index}/${p.commit_count} ${p.commit_hash.slice(0, 10)}`
      : p.commit_hash.slice(0, 10);
  const counts = p.total > 0 ? ` ${p.done}/${p.total}` : "";
  const step = `${p.phase_label}${counts} (step ${p.phase_index}/${p.phase_count})`;
  return {
    label: `Scanning ${commit} · ${step}${queuedSuffix}`,
    step,
    percent: Math.round(p.fraction * 100),
    indeterminate: false,
  };
}
