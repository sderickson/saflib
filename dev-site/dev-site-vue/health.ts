import type { CommitSummary } from "@saflib/dev-site-spec";

/**
 * Timeline health chip for a commit snapshot.
 *
 * **Review note (phase 6):** this is a deliberate first-cut heuristic, not a
 * settled product rule. Threshold: `test_lines / source_lines >= 0.2` → healthy.
 * Below that but with some tests → thin. Source with zero test lines → untested.
 * Empty / no source → empty. Adjust here (and mirror in CLI messaging later) if
 * the bar should be package-aware or based on test-case count instead of LOC.
 */
export type CommitHealthStatus = "healthy" | "thin" | "untested" | "empty";

export interface CommitHealth {
  status: CommitHealthStatus;
  /** test_lines / source_lines, or null when source_lines is 0. */
  testRatio: number | null;
  label: string;
  color: "success" | "warning" | "error" | "grey";
}

const HEALTHY_RATIO = 0.2;

export function commitHealth(
  summary: Pick<CommitSummary, "summary_metrics">,
): CommitHealth {
  const { source_lines, test_lines } = summary.summary_metrics;
  if (source_lines <= 0) {
    return {
      status: "empty",
      testRatio: null,
      label: "Empty",
      color: "grey",
    };
  }
  const testRatio = test_lines / source_lines;
  if (test_lines <= 0) {
    return {
      status: "untested",
      testRatio: 0,
      label: "Untested",
      color: "error",
    };
  }
  if (testRatio >= HEALTHY_RATIO) {
    return {
      status: "healthy",
      testRatio,
      label: "Healthy",
      color: "success",
    };
  }
  return {
    status: "thin",
    testRatio,
    label: "Thin tests",
    color: "warning",
  };
}
