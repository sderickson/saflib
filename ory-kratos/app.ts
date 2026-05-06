import express from "express";
import {
  createInternalMiddleware,
  createErrorMiddleware,
} from "@saflib/express";
import type { AuditCallbacks, KratosCourierCallbacks } from "./callbacks.ts";
import { makePostAuditHookHandler } from "./post-audit-hook.ts";
import { createPostKratosCourierHandler } from "./routes/post-kratos-courier.ts";

export interface CreateOryKratosAppOptions {
  callbacks?: KratosCourierCallbacks;
  auditCallbacks?: AuditCallbacks;
}

/**
 * Express app for the Ory Kratos HTTP courier callback only (internal network).
 */
export function createOryKratosApp(options: CreateOryKratosAppOptions = {}) {
  const callbacks = options.callbacks ?? {};
  const app = express();
  app.use(createInternalMiddleware());
  app.post(
    "/email/kratos-courier",
    createPostKratosCourierHandler(callbacks),
  );
  if (options.auditCallbacks) {
    app.post(
      "/audit/kratos-hook",
      makePostAuditHookHandler(options.auditCallbacks),
    );
  }
  app.use(createErrorMiddleware());
  return app;
}
