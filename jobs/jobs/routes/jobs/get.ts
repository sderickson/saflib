import { createHandler } from "@saflib/express";
import createError from "http-errors";
import type { JobsServiceResponseBody } from "jobs-spec";
import { jobQueries, JobNotFoundError } from "jobs-db";
import { jobsServiceStorage } from "../../src/context.ts";
import { mapJobToWire } from "../../src/mapJob.ts";

export const getJobHandler = createHandler(async (req, res) => {
  const ctx = jobsServiceStorage.getStore()!;
  const id = req.params.id as string;

  const { result, error } = await jobQueries.getByIdJob(ctx.dbKey, { id });
  if (error) {
    switch (true) {
      case error instanceof JobNotFoundError:
        throw createError(404, "Job not found");
      default:
        throw error satisfies never;
    }
  }

  const response: JobsServiceResponseBody["getJob"][200] = {
    job: mapJobToWire(result!),
    authorityAssertion: result!.authority.assertion,
  };
  res.status(200).json(response);
});
