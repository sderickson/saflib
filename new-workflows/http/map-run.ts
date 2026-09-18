import type { WorkflowRunEntity } from "@saflib/new-workflows-db";
import type { WorkflowRun } from "@saflib/new-workflows-spec";

/**
 * Maps a `new-workflows-db` run row to the wire `WorkflowRun`: date fields
 * → ISO strings, plus `is_advancing` (see `engine.ts`'s `isRunAdvancing`)
 * and `was_cancelled` (see `run-cancellation.ts`'s `wasRunCancelled`),
 * neither of which is a DB column on this row.
 */
export function mapRunToWire(
  run: WorkflowRunEntity,
  isAdvancing: boolean,
  wasCancelled: boolean,
): WorkflowRun {
  const { created_at, updated_at, ...rest } = run;
  return {
    ...rest,
    created_at: created_at.toISOString(),
    updated_at: updated_at.toISOString(),
    is_advancing: isAdvancing,
    was_cancelled: wasCancelled,
  };
}
