export type * from "./types.ts";
export * from "./errors.ts";

import { jobsDbManager } from "./instances.ts";
export const jobsDb = jobsDbManager.publicInterface();

// BEGIN WORKFLOW AREA query-exports FOR drizzle/add-query

export { createJob } from "./queries/job/create.ts";
export { claimNextJob } from "./queries/job/claim-next.ts";
export { heartbeatJob } from "./queries/job/heartbeat.ts";
export { recordAttemptResultJob } from "./queries/job/record-attempt-result.ts";
export { cancelByIdJob } from "./queries/job/cancel-by-id.ts";
export { cancelByOriginalRequestIdJob } from "./queries/job/cancel-by-original-request-id.ts";
export { retryByIdJob } from "./queries/job/retry-by-id.ts";
export { getByIdJob } from "./queries/job/get-by-id.ts";
export { listJob } from "./queries/job/list.ts";
export { recoverStalledJob } from "./queries/job/recover-stalled.ts";
export { listRunningJobsJob } from "./queries/job/list-running.ts";
export { deleteExpiredTerminalJob } from "./queries/job/delete-expired-terminal.ts";
export { countByOriginalRequestIdJob } from "./queries/job/count-by-original-request-id.ts";
export { countByStatusJob } from "./queries/job/count-by-status.ts";
// END WORKFLOW AREA
