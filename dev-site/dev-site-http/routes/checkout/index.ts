import express, { type IRouter } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as getCheckoutOperationJsonSpec } from "@saflib/dev-site-spec/operations/getCheckout";
import { getCheckoutHandler } from "./get.ts";

export function createCheckoutRouter(): IRouter {
  const router = express.Router();

  router.get(
    "/api/checkout",
    ...createOperationScopedMiddleware(getCheckoutOperationJsonSpec, {
      enforceAuth: false,
    }),
    getCheckoutHandler,
  );

  return router;
}
