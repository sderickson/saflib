import express, { type RequestHandler } from "express";

/**
 * Browsers send CSP reports as `application/csp-report` (or sometimes JSON); the global
 * `express.json()` middleware only parses `application/json`, so this runs on the
 * `/csp-violations` path before OpenAPI validation.
 */
export const cspReportJsonBody: RequestHandler = (req, res, next) => {
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
