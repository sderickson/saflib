import express, { type IRouter } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as getUsersByIdAdminOperationJsonSpec } from "@saflib/base-spec/operations/getUsersByIdAdmin";

// BEGIN WORKFLOW AREA handler-imports FOR express/add-handler
import { getUsersByIdAdminHandler } from "./users-by-id.ts";
// END WORKFLOW AREA

/**
 * Site-admin routes (identity lookup, etc.). Each route uses its own
 * operation OpenAPI fragment — do not mount full `jsonSpec` on a shared prefix.
 */
export function createAdminRouter(): IRouter {
  const router = express.Router();

  // BEGIN WORKFLOW AREA route-registrations FOR express/add-handler
  router.get(
    "/admin/users/by-id",
    ...createOperationScopedMiddleware(getUsersByIdAdminOperationJsonSpec),
    getUsersByIdAdminHandler,
  );
  // END WORKFLOW AREA

  return router;
}
