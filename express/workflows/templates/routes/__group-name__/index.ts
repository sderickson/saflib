import express, { type IRouter } from "express";
import {
  createOperationScopedMiddleware,
  uploadToDiskOptions,
} from "@saflib/express";
import { operationJsonSpec as __targetName____GroupName__OperationJsonSpec } from "template-package-spec/operations/__operationId__";

// BEGIN WORKFLOW AREA handler-imports FOR express/add-handler
import { __targetName____GroupName__Handler } from "./__target-name__.ts";
// END WORKFLOW AREA

/**
 * __group-name__ routes. Each route uses its own operation OpenAPI fragment —
 * do not mount full `jsonSpec` on a shared prefix.
 */
export function create__GroupName__Router(): IRouter {
  const router = express.Router();

  // BEGIN WORKFLOW AREA route-registrations FOR express/add-handler
  // TODO: set method and path from openapi/route (match urlPath in the spec).
  router.post(
    "/__group-name__/__target-name__",
    ...createOperationScopedMiddleware(
      __targetName____GroupName__OperationJsonSpec,
    ),
    __targetName____GroupName__Handler,
  );
  // END WORKFLOW AREA

  return router;
}
