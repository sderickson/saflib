import express from "express";
import {
  createInternalMiddleware,
  createErrorMiddleware,
} from "@saflib/express";
import type { KratosActionHandler } from "./actions.ts";
import type { KratosCourierCallbacks } from "./callbacks.ts";
import { makePostKratosActionHandler } from "./post-kratos-action.ts";
import { createPostKratosCourierHandler } from "./routes/post-kratos-courier.ts";

export interface CreateOryKratosAppOptions {
  callbacks?: KratosCourierCallbacks;
  actionHandler?: KratosActionHandler;
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
  if (options.actionHandler) {
    app.post(
      "/kratos/action",
      makePostKratosActionHandler(options.actionHandler),
    );
  }
  app.use(createErrorMiddleware());
  return app;
}
