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
  // `type` must accept every content type above: by default express.json()
  // only parses application/json and leaves csp-report bodies empty.
  express.json({ limit: "256kb", type: () => true })(req, res, (err: unknown) => {
    if (err) {
      next(err);
      return;
    }
    next();
  });
};
