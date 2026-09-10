import { createHandler } from "@saflib/express";
import type {
  JobsServiceResponseBody,
} from "@saflib/jobs-spec";

import type { JobStatus } from "@saflib/jobs-db";
import { jobsServiceStorage } from "../../src/context.ts";
import { mapJobToWire } from "../../src/mapJob.ts";

import { listJob } from "@saflib/jobs-db";
export const listJobsHandler = createHandler(async (req, res) => {
  const ctx = jobsServiceStorage.getStore()!;
  const query = req.query as {
    status?: JobStatus;
    operation_id?: string;
    user_id?: string;
    original_request_id?: string;
    created_after?: string;
    created_before?: string;
    limit?: string;
    offset?: string;
  };

  const { result } = await listJob(ctx.dbKey, {
    status: query.status,
    operation_id: query.operation_id,
    user_id: query.user_id,
    original_request_id: query.original_request_id,
    created_after: query.created_after
      ? new Date(query.created_after)
      : undefined,
    created_before: query.created_before
      ? new Date(query.created_before)
      : undefined,
    limit: query.limit != null ? Number(query.limit) : undefined,
    offset: query.offset != null ? Number(query.offset) : undefined,
  });

  const response: JobsServiceResponseBody["listJobs"][200] = {
    jobs: result!.map(mapJobToWire),
  };
  res.status(200).json(response);
});
