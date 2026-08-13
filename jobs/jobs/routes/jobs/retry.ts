import { createHandler } from "@saflib/express";
import createError from "http-errors";
import type { JobsServiceResponseBody } from "jobs-spec";
import { JobNotFoundError, JobNotRetryableError, retryByIdJob } from "@saflib/jobs-db";
import { jobsServiceStorage } from "../../src/context.ts";
import { mapJobToWire } from "../../src/mapJob.ts";
import { signalJobsWake } from "../../src/runJobs.ts";

export const retryJobHandler = createHandler(async (req, res) => {
  const ctx = jobsServiceStorage.getStore()!;
  const id = req.params.id as string;

  const { result, error } = await retryByIdJob(ctx.dbKey, {
    id,
    now: new Date(),
  });
  if (error) {
    switch (true) {
      case error instanceof JobNotFoundError:
        throw createError(404, "Job not found");
      case error instanceof JobNotRetryableError:
        throw createError(409, "Job is not dead or cancelled and cannot be retried");
      default:
        throw error satisfies never;
    }
  }

  signalJobsWake();

  const response: JobsServiceResponseBody["retryJob"][200] = {
    job: mapJobToWire(result!),
  };
  res.status(200).json(response);
});
