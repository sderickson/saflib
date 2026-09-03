import { createHandler } from "@saflib/express";
import type {
  JobsServiceRequestBody,
  JobsServiceResponseBody,
} from "@saflib/jobs-spec";

import { jobsServiceStorage } from "../../src/context.ts";
import { mapJobToWire } from "../../src/mapJob.ts";

import { cancelByOriginalRequestIdJob } from "@saflib/jobs-db";
export const cancelJobsByOriginalRequestHandler = createHandler(
  async (req, res) => {
    const ctx = jobsServiceStorage.getStore()!;
    const data: JobsServiceRequestBody["cancelJobsByOriginalRequest"] =
      req.body;

    const { result } = await cancelByOriginalRequestIdJob(
      ctx.dbKey,
      {
        original_request_id: data.original_request_id,
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
