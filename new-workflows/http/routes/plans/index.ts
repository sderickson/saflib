import express, { type IRouter } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as listPlansOperationJsonSpec } from "@saflib/new-workflows-spec/operations/listPlans";
import { operationJsonSpec as createPlanOperationJsonSpec } from "@saflib/new-workflows-spec/operations/createPlan";
import { listPlansHandler } from "./list.ts";
import { createPlanHandler } from "./create.ts";

export function createPlansRouter(): IRouter {
  const router = express.Router();

  router.get(
    "/plans",
    ...createOperationScopedMiddleware(listPlansOperationJsonSpec, {
      enforceAuth: false,
    }),
    listPlansHandler,
  );

  router.post(
    "/plans",
    ...createOperationScopedMiddleware(createPlanOperationJsonSpec, {
      enforceAuth: false,
    }),
    createPlanHandler,
  );

  return router;
}
