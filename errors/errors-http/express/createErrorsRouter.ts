import { Router } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as recordReportedErrorOperationJsonSpec } from "@saflib/errors-spec/operations/recordReportedError";
import { operationJsonSpec as postCspViolationReportOperationJsonSpec } from "@saflib/errors-spec/operations/postCspViolationReport";
import { operationJsonSpec as postAdminTestErrorOperationJsonSpec } from "@saflib/errors-spec/operations/postAdminTestError";
import { operationJsonSpec as listReportedErrorsOperationJsonSpec } from "@saflib/errors-spec/operations/listReportedErrors";
import { createRecordReportedErrorHandler } from "./record-reported-error.ts";
import { createPostCspViolationReportHandler } from "./post-csp-violation-report.ts";
import { createPostAdminTestErrorHandler } from "./post-admin-test-error.ts";
import { createListReportedErrorsHandler } from "./list-reported-errors.ts";
import { cspReportJsonBody } from "./csp-report-json-body.ts";

/**
 * Production error routes (always mounted):
 * - `POST /csp-violations` — browser CSP reports
 * - `POST /admin/test-error` — intentional server error (site-admin-only)
 */
export function createErrorsRouter(): Router {
  const router = Router();

  router.use("/csp-violations", cspReportJsonBody);
  router.post(
    "/csp-violations",
    ...createOperationScopedMiddleware(postCspViolationReportOperationJsonSpec),
    createPostCspViolationReportHandler(),
  );

  router.post(
    "/admin/test-error",
    ...createOperationScopedMiddleware(postAdminTestErrorOperationJsonSpec),
    createPostAdminTestErrorHandler(),
  );

  return router;
}

/**
 * Development-only mock error routes (ring buffer):
 * - `POST /errors/record` — browser client error capture
 * - `GET /admin/errors` — ring buffer listing (site-admin-only)
 */
export function createDevErrorsRouter(): Router {
  const router = Router();

  router.post(
    "/errors/record",
    ...createOperationScopedMiddleware(recordReportedErrorOperationJsonSpec),
    createRecordReportedErrorHandler(),
  );

  router.get(
    "/admin/errors",
    ...createOperationScopedMiddleware(listReportedErrorsOperationJsonSpec),
    createListReportedErrorsHandler(),
  );

  return router;
}
