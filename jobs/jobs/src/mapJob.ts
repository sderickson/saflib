import type { JobEntity } from "@saflib/jobs-db";
import type { Job } from "@saflib/jobs-spec";

/**
 * Maps a jobs-db row to the wire `Job`: date fields → ISO strings, omit
 * heartbeat/updated_at, and strip the embedded enqueue assertion from authority.
 */
export function mapJobToWire(job: JobEntity): Job {
  const { assertion: _assertion, ...authority } = job.authority;
  const {
    heartbeat_at: _heartbeat,
    updated_at: _updated,
    authority: _authority,
    run_at,
    created_at,
    started_at,
    finished_at,
    ...rest
  } = job;
  return {
    ...rest,
    authority,
    run_at: run_at.toISOString(),
    created_at: created_at.toISOString(),
    started_at: started_at?.toISOString() ?? null,
    finished_at: finished_at?.toISOString() ?? null,
  };
}
