import express from "express";
import type { IdentityServiceCallbacks } from "@saflib/identity-common";
import {
  startExpressServer,
  createInternalMiddleware,
  createErrorMiddleware,
} from "@saflib/express";
import { makeSubsystemReporters } from "@saflib/node";
import { typedEnv } from "./env.ts";
import { postKratosCourier } from "./routes/post-kratos-courier.ts";

export interface StartOryKratosServiceOptions {
  callbacks?: IdentityServiceCallbacks;
}

export function startOryKratosService(options?: StartOryKratosServiceOptions) {
  const { log, logError } = makeSubsystemReporters("init", "startOryKratosService");
  try {
    log.info(`Starting Ory Kratos courier server at ${typedEnv.KRATOS_COURIER_HTTP_HOST}`);
    const app = express();
    app.use(createInternalMiddleware());
    app.locals.identityCallbacks = options?.callbacks ?? {};
    app.post("/email/kratos-courier", postKratosCourier);
    app.use(createErrorMiddleware());

    const port = parseInt(
      typedEnv.KRATOS_COURIER_HTTP_HOST.split(":")[1] || "80",
      10,
    );
    startExpressServer(app, { port });
    log.info("Ory Kratos courier server startup complete.");
  } catch (error) {
    logError(error);
    console.error(error);
  }
}

export type { IdentityServiceCallbacks };
