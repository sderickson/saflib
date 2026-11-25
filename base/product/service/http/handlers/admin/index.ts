import express, { type IRouter } from "express";

// BEGIN WORKFLOW AREA handler-imports FOR express/add-handler
// END WORKFLOW AREA

/**
 * Site-admin routes for this product. (Identity lookups and the Users page
 * come from `createKratosAdminRouter` in `@saflib/ory-kratos-http`.) Each route uses its own
 * operation OpenAPI fragment — do not mount full `jsonSpec` on a shared prefix.
 */
export function createAdminRouter(): IRouter {
  const router = express.Router();

  // BEGIN WORKFLOW AREA route-registrations FOR express/add-handler
  // END WORKFLOW AREA

  return router;
}
