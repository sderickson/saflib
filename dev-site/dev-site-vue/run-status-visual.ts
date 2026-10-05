/**
 * A single "what's going on with this run" visual, shared by `PlanNavIcon`
 * (a nav-list status dot) and `RunView` (the run's own status chip) so the
 * two never drift out of sync. Priority, highest first:
 *
 * 1. `is_advancing` — a step is genuinely running right now, server-side
 *    (see `engine.ts`'s `isRunAdvancing`) — always shows a spinner,
 *    regardless of `status`, which only reflects the *last completed*
 *    step (so a retry in progress would otherwise still read "failed").
 * 2. `was_cancelled` — the run is `failed` only because a person clicked
 *    Stop (see `run-cancellation.ts`), not a genuine step error — shown
 *    as "paused", not "failed".
 * 3. `status` itself.
 */

export interface RunLike {
  status: string;
  is_advancing: boolean;
  was_cancelled: boolean;
}

export interface RunStatusVisual {
  label: string;
  /** When true, render a spinner instead of `icon`. */
  spinner: boolean;
  /** Present unless `spinner` is true. */
  icon?: string;
  /** A Vuetify theme color name, or a literal Material color token (e.g. "light-blue") for states with no matching theme color. */
  color?: string;
}

export function runStatusVisual(run: RunLike | undefined): RunStatusVisual {
  if (!run) return { label: "…", spinner: false };
  if (run.is_advancing) return { label: "running", spinner: true, color: "info" };
  if (run.was_cancelled) {
    return { label: "paused", spinner: false, icon: "mdi-pause-circle", color: "light-blue" };
  }
  switch (run.status) {
    case "done":
      return { label: "done", spinner: false, icon: "mdi-check-circle", color: "success" };
    case "failed":
      return { label: "failed", spinner: false, icon: "mdi-close-circle", color: "error" };
    case "awaiting_prompt":
    case "awaiting_user":
      return { label: run.status, spinner: false, icon: "mdi-pause-circle", color: "warning" };
    default:
      return { label: run.status, spinner: false, icon: "mdi-progress-clock", color: "info" };
  }
}

/** The nav's "never run at all" icon — outside `runStatusVisual` since there's no `run` object at all in that case. */
export const NOT_RUN_YET_ICON = "mdi-play-circle-outline";
