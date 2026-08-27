import express, { Router, type RequestHandler } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as recordReportedErrorOperationJsonSpec } from "@saflib/errors-spec/operations/recordReportedError";
import { operationJsonSpec as postCspViolationReportOperationJsonSpec } from "@saflib/errors-spec/operations/postCspViolationReport";
import { operationJsonSpec as postAdminTestErrorOperationJsonSpec } from "@saflib/errors-spec/operations/postAdminTestError";
import { operationJsonSpec as listReportedErrorsOperationJsonSpec } from "@saflib/errors-spec/operations/listReportedErrors";
import { createRecordReportedErrorHandler } from "./record-reported-error.ts";
import { createPostCspViolationReportHandler } from "./post-csp-violation-report.ts";
import { createPostAdminTestErrorHandler } from "./post-admin-test-error.ts";
import { createListReportedErrorsHandler } from "./list-reported-errors.ts";

/**
 * Browsers send CSP reports as `application/csp-report` (or sometimes JSON); the global
 * `express.json()` middleware only parses `application/json`, so this runs on the
 * `/csp-violations` path before OpenAPI validation.
 */
const cspReportJsonBody: RequestHandler = (req, res, next) => {
  if (req.method !== "POST") {
    next();
    return;
  }
  const ct = (req.headers["content-type"] ?? "").toLowerCase();
  if (
    !ct.includes("application/csp-report") &&
    !ct.includes("application/reports+json") &&
    !ct.includes("application/json")
  ) {
    next();
    return;
  }
  express.json({ limit: "256kb" })(req, res, (err: unknown) => {
    if (err) {
      next(err);
      return;
    }
    next();
  });
};

/**
 * Unified error reporting (always mounted, including production / prod-local):
 * - `POST /errors/record` — browser client error capture
 * - `POST /csp-violations` — browser CSP reports → same ring buffer
 * - `POST /admin/test-error` — intentional server error (site-admin-only)
 * - `GET /admin/errors` — ring buffer listing (site-admin-only)
 */
export function createErrorsRouter(): Router {
  const router = Router();

  router.post(
    "/errors/record",
    ...createOperationScopedMiddleware(recordReportedErrorOperationJsonSpec),
    createRecordReportedErrorHandler(),
  );

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

  router.get(
    "/admin/errors",
    ...createOperationScopedMiddleware(listReportedErrorsOperationJsonSpec),
    createListReportedErrorsHandler(),
  );

  return router;
}

/**
 * @deprecated Admin error routes live on {@link createErrorsRouter} (always mounted).
 * Kept as a no-op so older composition call sites do not double-register.
 */
export function createDevErrorsRouter(): Router {
  return Router();
}
