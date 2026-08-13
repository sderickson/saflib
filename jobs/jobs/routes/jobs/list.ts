import { createHandler } from "@saflib/express";
import type {
  JobsServiceResponseBody,
} from "jobs-spec";

import type { JobStatus } from "@saflib/jobs-db";
import { jobsServiceStorage } from "../../src/context.ts";
import { mapJobToWire } from "../../src/mapJob.ts";

import { listJob } from "@saflib/jobs-db";
export const listJobsHandler = createHandler(async (req, res) => {
  const ctx = jobsServiceStorage.getStore()!;
  const query = req.query as {
    status?: JobStatus;
    operationId?: string;
    userId?: string;
    originalRequestId?: string;
    createdAfter?: string;
    createdBefore?: string;
    limit?: string;
    offset?: string;
  };

  const { result } = await listJob(ctx.dbKey, {
    status: query.status,
    operationId: query.operationId,
    userId: query.userId,
    originalRequestId: query.originalRequestId,
    createdAfter: query.createdAfter
      ? new Date(query.createdAfter)
      : undefined,
    createdBefore: query.createdBefore
      ? new Date(query.createdBefore)
      : undefined,
    limit: query.limit != null ? Number(query.limit) : undefined,
    offset: query.offset != null ? Number(query.offset) : undefined,
  });

  const response: JobsServiceResponseBody["listJobs"][200] = {
    jobs: result!.map(mapJobToWire),
  };
  res.status(200).json(response);
});
