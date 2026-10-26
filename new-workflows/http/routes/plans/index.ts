import express, { type IRouter } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as listPlansOperationJsonSpec } from "@saflib/new-workflows-spec/operations/listPlans";
import { operationJsonSpec as createPlanOperationJsonSpec } from "@saflib/new-workflows-spec/operations/createPlan";
import { operationJsonSpec as listPlanUnexpectedChangesOperationJsonSpec } from "@saflib/new-workflows-spec/operations/listPlanUnexpectedChanges";
import { listPlansHandler } from "./list.ts";
import { createPlanHandler } from "./create.ts";
import { listPlanUnexpectedChangesHandler } from "./unexpected-changes.ts";

export function createPlansRouter(): IRouter {
  const router = express.Router();

  router.get(
    "/plans",
    ...createOperationScopedMiddleware(listPlansOperationJsonSpec),
    listPlansHandler,
  );

  router.get(
    "/plans/unexpected-changes",
    ...createOperationScopedMiddleware(listPlanUnexpectedChangesOperationJsonSpec),
    listPlanUnexpectedChangesHandler,
  );

  router.post(
    "/plans",
    ...createOperationScopedMiddleware(createPlanOperationJsonSpec),
    createPlanHandler,
  );

  return router;
}
