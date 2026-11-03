import { randomUUID } from "node:crypto";
import { createHandler } from "@saflib/express";
import type {
  ResponseBody as JobsDemoStepCJobsDemoResponseBody,
} from "@saflib/base-spec/operations/jobsDemoStepC";
import { recordDemoStepCCompletion } from "./_helpers.ts";

export const jobsDemoStepCHandler = createHandler(async (_req, res) => {
  recordDemoStepCCompletion(randomUUID());

  const response: JobsDemoStepCJobsDemoResponseBody["jobsDemoStepC"][200] = {
    result: { done: true },
  };
  res.status(200).json(response);
});
