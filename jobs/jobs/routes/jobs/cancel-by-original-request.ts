import { createHandler } from "@saflib/express";
import type {
  JobsServiceRequestBody,
  JobsServiceResponseBody,
} from "jobs-spec";
import { jobQueries } from "jobs-db";
import { jobsServiceStorage } from "../../src/context.ts";
import { mapJobToWire } from "../../src/mapJob.ts";

export const cancelJobsByOriginalRequestHandler = createHandler(
  async (req, res) => {
    const ctx = jobsServiceStorage.getStore()!;
    const data: JobsServiceRequestBody["cancelJobsByOriginalRequest"] =
      req.body;

    const { result } = await jobQueries.cancelByOriginalRequestIdJob(
      ctx.dbKey,
      {
        originalRequestId: data.originalRequestId,
        now: new Date(),
      },
    );

    const response: JobsServiceResponseBody["cancelJobsByOriginalRequest"][200] =
      {
        jobs: result!.map(mapJobToWire),
      };
    res.status(200).json(response);
  },
);
