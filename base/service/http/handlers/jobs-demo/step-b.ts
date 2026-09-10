import { createHandler } from "@saflib/express";
import { enqueue } from "@saflib/jobs-http";
import createError from "http-errors";
import type { ResponseBody as JobsDemoStepBJobsDemoResponseBody } from "@saflib/base-spec/operations/jobsDemoStepB";
import type { components } from "@saflib/base-spec";
import {
  demoFailureKey,
  recordDemoFailure,
} from "./_helpers.ts";

type JobsDemoOptions = components["schemas"]["jobs-demo-options"];

export const jobsDemoStepBHandler = createHandler(async (req, res) => {
  const body = (req.body ?? {}) as JobsDemoOptions;
  const key = demoFailureKey(body);
  const failuresBeforeSuccess = body.failures_before_success ?? 0;

  if (failuresBeforeSuccess > 0) {
    const attempts = recordDemoFailure(key);
    if (attempts <= failuresBeforeSuccess) {
      throw createError(503, "Simulated retryable failure for jobs demo");
    }
  }

  await enqueue({
    operation_id: "jobsDemoStepC",
    request: { body },
  });

  const response: JobsDemoStepBJobsDemoResponseBody["jobsDemoStepB"][200] = {
    result: { enqueued: "jobsDemoStepC" },
  };
  res.status(200).json(response);
});
