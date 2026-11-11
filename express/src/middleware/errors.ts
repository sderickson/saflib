import createError, { HttpError } from "http-errors";
import type { Request, Response, NextFunction, Handler } from "express";
import {
  getErrorCollectors,
  getSafReporters,
  runWithOperationName,
  safReportersStorage,
} from "@saflib/node";
import { typedEnv } from "@saflib/env";
/**
 * 404 Handler
 * Catches requests to undefined routes
 */
export const notFoundHandler: Handler = (_req, _res, next) => {
  next(createError(404));
};

type ValidationIssue = { path?: string; message?: string; errorCode?: string };

/** Most issues to log per request (oneOf failures list every branch). */
const MAX_LOGGED_ISSUES = 20;

/** typeof, telling arrays and null apart; "missing" when absent. */
function valueType(value: unknown): string {
  if (value === undefined) return "missing";
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/**
 * The type of the request value an issue points at ("/body/a/0/b",
 * "/query/x", "/params/id", "/headers/h"). Types only: request values can
 * hold personal data and never go in logs.
 */
function requestValueTypeAt(
  req: Request,
  path: string | undefined,
): string | undefined {
  if (!path) return undefined;
  const [location, ...rest] = path
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
  const roots: Record<string, unknown> = {
    body: req.body,
    query: req.query,
    params: req.params,
    headers: req.headers,
  };
  if (!location || !(location in roots)) return undefined;
  let value: unknown = roots[location];
  for (const segment of rest) {
    if (value === null || typeof value !== "object") return "missing";
    value = (value as Record<string, unknown>)[segment];
  }
  return valueType(value);
}

/**
 * Log a request the OpenAPI validator rejected (it attaches `errors`), so
 * 400s that never reach a handler are diagnosable: the failing paths and
 * rules, and the type found at each path. Never the values.
 */
function logRequestValidationFailure(
  err: HttpError & { errors?: ValidationIssue[] },
  req: Request,
  status: number,
): void {
  const issues = err.errors ?? [];
  getSafReporters().log.warn("request failed validation", {
    operation: req.openapi?.schema?.operationId,
    method: req.method,
    route: req.openapi?.openApiRoute,
    status,
    issue_count: issues.length,
    issues: issues.slice(0, MAX_LOGGED_ISSUES).map((issue) => ({
      path: issue.path,
      message: issue.message,
      error_code: issue.errorCode,
      submitted_type: requestValueTypeAt(req, issue.path),
    })),
  });
}

/**
 * Error Handler
 * Central error handling middleware that logs errors and returns standardized error responses
 */
export const errorHandler = (
  err: HttpError,
  req: Request,
  res: Response,
  _: NextFunction,
): void => {
  const status = err.status || 500;

  // This runs in the request's early context, created before the route
  // matched (operation "unknown-operation"); label logs with the operation.
  runWithOperationName(req.openapi?.schema?.operationId, () =>
    logError(err, req, status),
  );

  // Send error response
  res.status(status);
  res.json({
    message: err.message,
    status,
    code: err.code,
  });
};

function logError(err: HttpError, req: Request, status: number): void {
  const validationIssues = (err as HttpError & { errors?: unknown }).errors;
  // 400 only: the validator also attaches errors to its 404/405 (unknown
  // route or method), which aren't worth a warning each.
  if (status === 400 && Array.isArray(validationIssues)) {
    logRequestValidationFailure(
      err as HttpError & { errors: ValidationIssue[] },
      req,
      status,
    );
    return;
  }

  if (status >= 500) {
    if (typedEnv.NODE_ENV === "test" && getErrorCollectors().length === 0) {
      console.error(err.stack);
    }
    const store = safReportersStorage.getStore();
    if (store) {
      store.logError(err);
    } else if (
      typedEnv.NODE_ENV !== "test" ||
      getErrorCollectors().length === 0
    ) {
      console.log("Error", err);
    }
  }
}
