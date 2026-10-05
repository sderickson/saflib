import type { WorkflowLogEntity } from "@saflib/new-workflows-db";
import type { WorkflowLogEntry } from "@saflib/new-workflows-spec";

/** Maps a `new-workflows-db` log row to the wire `WorkflowLogEntry`: date fields → ISO strings. */
export function mapLogToWire(log: WorkflowLogEntity): WorkflowLogEntry {
  const { created_at, ...rest } = log;
  return {
    ...rest,
    created_at: created_at.toISOString(),
  };
}
