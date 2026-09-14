import type { WorkflowRunEntity } from "@saflib/new-workflows-db";
import type { WorkflowRun } from "@saflib/new-workflows-spec";

/** Maps a `new-workflows-db` run row to the wire `WorkflowRun`: date fields → ISO strings. */
export function mapRunToWire(run: WorkflowRunEntity): WorkflowRun {
  const { created_at, updated_at, ...rest } = run;
  return {
    ...rest,
    created_at: created_at.toISOString(),
    updated_at: updated_at.toISOString(),
  };
}
