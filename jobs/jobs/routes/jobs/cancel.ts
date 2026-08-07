import { createHandler } from "@saflib/express";
import createError from "http-errors";
import type { JobsServiceResponseBody } from "jobs-spec";
import {
  jobQueries,
  JobNotCancellableError,
  JobNotFoundError,
} from "@saflib/jobs-db";
import { jobsServiceStorage } from "../../src/context.ts";
import { mapJobToWire } from "../../src/mapJob.ts";

export const cancelJobHandler = createHandler(async (req, res) => {
  const ctx = jobsServiceStorage.getStore()!;
  const id = req.params.id as string;

  const { result, error } = await jobQueries.cancelByIdJob(ctx.dbKey, {
    id,
    now: new Date(),
  });
  if (error) {
    switch (true) {
      case error instanceof JobNotFoundError:
        throw createError(404, "Job not found");
      case error instanceof JobNotCancellableError:
        throw createError(
          409,
          "Job is running (or otherwise not cancellable) and was not interrupted",
        );
      default:
        throw error satisfies never;
    }
  }

  const response: JobsServiceResponseBody["cancelJob"][200] = {
    job: mapJobToWire(result!),
  };
  res.status(200).json(response);
});
