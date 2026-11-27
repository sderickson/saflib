import { Router } from "express";
import {
  createOperationScopedMiddleware,
  makeRegisterRoute,
} from "@saflib/express";
import { operationJsonSpec as recordReportedErrorOperationJsonSpec } from "@saflib/errors-spec/operations/recordReportedError";
import { operationJsonSpec as reportClientErrorOperationJsonSpec } from "@saflib/errors-spec/operations/reportClientError";
import { operationJsonSpec as postCspViolationReportOperationJsonSpec } from "@saflib/errors-spec/operations/postCspViolationReport";
import { operationJsonSpec as postAdminTestErrorOperationJsonSpec } from "@saflib/errors-spec/operations/postAdminTestError";
import { operationJsonSpec as raiseTestErrorMaintenanceOperationJsonSpec } from "@saflib/errors-spec/operations/raiseTestErrorMaintenance";
import { createRecordReportedErrorHandler } from "./record-reported-error.ts";
import { createPostCspViolationReportHandler } from "./post-csp-violation-report.ts";
import { createPostAdminTestErrorHandler } from "./post-admin-test-error.ts";
import { createRaiseTestErrorMaintenanceHandler } from "./raise-test-error-maintenance.ts";
import { cspReportJsonBody } from "./csp-report-json-body.ts";

const registerRoute = makeRegisterRoute({});

/**
 * Production error routes (always mounted):
 * - `POST /csp-violations` — browser CSP reports
 * - `POST /errors/report` — browser errors from signed-in users
 * - `POST /admin/test-error` — intentional server error (`session: [site-admin]`)
 * - `POST /maintenance/raise-test-error` — jobs chain probe (`background`)
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
    "/errors/report",
    ...createOperationScopedMiddleware(reportClientErrorOperationJsonSpec),
    createRecordReportedErrorHandler(),
  );

  router.post(
    "/admin/test-error",
    ...createOperationScopedMiddleware(postAdminTestErrorOperationJsonSpec),
    createPostAdminTestErrorHandler(),
  );

  registerRoute(
    router,
    raiseTestErrorMaintenanceOperationJsonSpec,
    createRaiseTestErrorMaintenanceHandler(),
  );

  return router;
}

/**
 * Development-only error routes:
 * - `POST /errors/record` — browser client error capture (feeds Issues via sinks)
 */
export function createDevErrorsRouter(): Router {
  const router = Router();

  router.post(
    "/errors/record",
    ...createOperationScopedMiddleware(recordReportedErrorOperationJsonSpec),
    createRecordReportedErrorHandler(),
  );

  return router;
}
