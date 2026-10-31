import express, { type IRouter } from "express";
import {
  createOperationScopedMiddleware,
} from "@saflib/express";
import { operationJsonSpec as startJobsDemoJobsDemoOperationJsonSpec } from "@saflib/base-spec/operations/startJobsDemo";
import { operationJsonSpec as jobsDemoStepBJobsDemoOperationJsonSpec } from "@saflib/base-spec/operations/jobsDemoStepB";
import { operationJsonSpec as jobsDemoStepCJobsDemoOperationJsonSpec } from "@saflib/base-spec/operations/jobsDemoStepC";
import { startJobsDemoHandler } from "./start.ts";
import { jobsDemoStepBHandler } from "./step-b.ts";
import { jobsDemoStepCHandler } from "./step-c.ts";

/** Jobs demo chain routes for site-admin poke tests and admin jobs UI. */
export function createJobsDemoRouter(): IRouter {
  const router = express.Router();

  router.post(
    "/jobs-demo/start",
    ...createOperationScopedMiddleware(startJobsDemoJobsDemoOperationJsonSpec),
    startJobsDemoHandler,
  );

  router.post(
    "/jobs-demo/step-b",
    ...createOperationScopedMiddleware(jobsDemoStepBJobsDemoOperationJsonSpec),
    jobsDemoStepBHandler,
  );

  router.post(
    "/jobs-demo/step-c",
    ...createOperationScopedMiddleware(jobsDemoStepCJobsDemoOperationJsonSpec),
    jobsDemoStepCHandler,
  );

  return router;
}
