import type { ResponseBody } from "@saflib/dev-site-spec/operations/listScanJobs";
import type { ScanJob } from "../../scan-dispatch.ts";

type ApiScanJob = ResponseBody["listScanJobs"][200]["scan_jobs"][number];

/** Snapshot a job for the wire (the queue keeps mutating its own copy). */
export function toApiScanJob(job: ScanJob): ApiScanJob {
  return {
    ...job,
    ...(job.progress ? { progress: { ...job.progress } } : {}),
  };
}
