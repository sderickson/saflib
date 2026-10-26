/**
 * Determinate progress for a scan: which commit, which phase, and how far
 * through that phase. The scan worker posts these to the main thread, which
 * keeps the latest one for `GET /api/scan/progress`.
 */

/** Phases of analyzing one commit, in order. */
export const SCAN_PHASES = [
  "list-files",
  "parse-sources",
  "measure-packages",
  "check-issues",
  "save",
] as const;

export type ScanPhase = (typeof SCAN_PHASES)[number];

export const SCAN_PHASE_LABELS: Record<ScanPhase, string> = {
  "list-files": "Listing files",
  "parse-sources": "Parsing source files",
  "measure-packages": "Measuring packages",
  "check-issues": "Checking package issues",
  save: "Saving",
};

/**
 * Share of one commit's scan time each phase takes, from profiling a ~80
 * package repo. Parsing dominates when many blobs are new; issue checks
 * dominate otherwise. Only used to make the bar move evenly.
 */
const PHASE_WEIGHTS: Record<ScanPhase, number> = {
  "list-files": 0.05,
  "parse-sources": 0.4,
  "measure-packages": 0.05,
  "check-issues": 0.45,
  save: 0.05,
};

export interface ScanProgress {
  /** Commit being analyzed. */
  commit_hash: string;
  /** 1-based position of this commit in the run. */
  commit_index: number;
  commit_count: number;
  phase: ScanPhase;
  phase_label: string;
  /** 1-based position of `phase` in {@link SCAN_PHASES}. */
  phase_index: number;
  phase_count: number;
  /** Units done in this phase (files parsed, packages checked); 0 when not counted. */
  done: number;
  total: number;
  /** Overall run progress, 0..1. */
  fraction: number;
}

export type ScanProgressListener = (progress: ScanProgress) => void;

/** Reports one phase's progress; `done`/`total` are optional unit counts. */
export type PhaseReporter = (phase: ScanPhase, done?: number, total?: number) => void;

/** Builds {@link ScanProgress} values for one commit within a run. */
export function makePhaseReporter(
  listener: ScanProgressListener | undefined,
  commit: { hash: string; index: number; count: number },
): PhaseReporter {
  if (!listener) return () => {};
  return (phase, done = 0, total = 0) => {
    listener(
      buildScanProgress(commit, phase, done, total),
    );
  };
}

export function buildScanProgress(
  commit: { hash: string; index: number; count: number },
  phase: ScanPhase,
  done: number,
  total: number,
): ScanProgress {
  const phaseIdx = SCAN_PHASES.indexOf(phase);
  let before = 0;
  for (let i = 0; i < phaseIdx; i++) before += PHASE_WEIGHTS[SCAN_PHASES[i]!];
  const within = total > 0 ? Math.min(done / total, 1) : 0;
  const commitFraction = before + PHASE_WEIGHTS[phase] * within;
  const count = Math.max(commit.count, 1);
  return {
    commit_hash: commit.hash,
    commit_index: commit.index,
    commit_count: commit.count,
    phase,
    phase_label: SCAN_PHASE_LABELS[phase],
    phase_index: phaseIdx + 1,
    phase_count: SCAN_PHASES.length,
    done,
    total,
    fraction: Math.min((commit.index - 1 + commitFraction) / count, 1),
  };
}
