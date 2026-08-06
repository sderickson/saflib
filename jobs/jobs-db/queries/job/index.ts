// BEGIN WORKFLOW AREA query-exports FOR drizzle/add-query
import { createJob } from "./create.ts";
import { claimNextJob } from "./claim-next.ts";
import { heartbeatJob } from "./heartbeat.ts";
import { recordAttemptResultJob } from "./record-attempt-result.ts";
import { cancelByIdJob } from "./cancel-by-id.ts";
import { cancelByOriginalRequestIdJob } from "./cancel-by-original-request-id.ts";
import { retryByIdJob } from "./retry-by-id.ts";
import { getByIdJob } from "./get-by-id.ts";
import { listJob } from "./list.ts";
import { recoverStalledJob } from "./recover-stalled.ts";
import { deleteExpiredTerminalJob } from "./delete-expired-terminal.ts";
import { countByOriginalRequestIdJob } from "./count-by-original-request-id.ts";
import { countByStatusJob } from "./count-by-status.ts";
// END WORKFLOW AREA

export const jobQueries = {
  // BEGIN WORKFLOW AREA query-object FOR drizzle/add-query
  createJob,
  claimNextJob,
  heartbeatJob,
  recordAttemptResultJob,
  cancelByIdJob,
  cancelByOriginalRequestIdJob,
  retryByIdJob,
  getByIdJob,
  listJob,
  recoverStalledJob,
  deleteExpiredTerminalJob,
  countByOriginalRequestIdJob,
  countByStatusJob,
  // END WORKFLOW AREA
};
