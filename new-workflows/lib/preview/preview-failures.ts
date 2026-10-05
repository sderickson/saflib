/**
 * Minimal fields needed to classify a preview step — matches both the
 * lib `PreviewStepEntry` shape and the wire `preview-step-entry` schema
 * (once `workflow_id`/`step_index` are ignored).
 */
export interface PreviewFailureClassifiable {
  kind: string;
  applied: boolean;
  reason?: string;
}

const MECHANICAL_KINDS = new Set(["copy", "transform-file", "cd"]);

/**
 * Steps whose `applied: false` is expected — their kind just isn't
 * mechanically previewable (prompt/command/update/…), or `stepSkipIf`
 * short-circuited them — rather than a genuine failure. See
 * `previewRun`'s walk: `copy`/`transform-file`/`cd` only get
 * `applied: false` when the step itself threw (e.g. a
 * `validateWorkflowAreas` conflict or a missing `package.json`).
 */
export function isExpectedPreviewSkip(entry: PreviewFailureClassifiable): boolean {
  if (entry.reason === "skipped (stepSkipIf)") return true;
  return !MECHANICAL_KINDS.has(entry.kind);
}

/**
 * A mechanical step that preview tried to apply and that threw — the
 * smoke-test signal for template/area/path problems. Shared by CLI
 * `preview`/`validate` and the RunView Preview pane so they agree on
 * what counts as a real failure.
 */
export function isMechanicalPreviewFailure(entry: PreviewFailureClassifiable): boolean {
  return !entry.applied && !isExpectedPreviewSkip(entry);
}
