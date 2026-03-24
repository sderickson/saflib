import express from "express";
import {
  createInternalMiddleware,
  createErrorMiddleware,
} from "@saflib/express";
import type { IdentityServiceCallbacks } from "./callbacks.ts";
import { createPostKratosCourierHandler } from "./routes/post-kratos-courier.ts";

export interface CreateOryKratosAppOptions {
  callbacks?: IdentityServiceCallbacks;
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
  app.use(createErrorMiddleware());
  return app;
}
