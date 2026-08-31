import { createHandler } from "@saflib/express";
import { enqueue } from "@saflib/jobs";
import type { ResponseBody as StartJobsDemoJobsDemoResponseBody } from "@saflib/base-spec/operations/startJobsDemo";
import type { components } from "@saflib/base-spec";

type JobsDemoOptions = components["schemas"]["jobs-demo-options"];

export const startJobsDemoHandler = createHandler(async (req, res) => {
  const body = (req.body ?? {}) as JobsDemoOptions;

  const { job } = await enqueue({
    operation_id: "jobsDemoStepB",
    request: { body },
    dedupe_key: body.dedupeKey ?? undefined,
    concurrency_key: body.concurrencyKey ?? undefined,
  });

  const response: StartJobsDemoJobsDemoResponseBody["startJobsDemo"][200] = {
    job,
  };
  res.status(200).json(response);
});
