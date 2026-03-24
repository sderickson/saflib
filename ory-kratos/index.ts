import { startExpressServer } from "@saflib/express";
import { makeSubsystemReporters } from "@saflib/node";
import { typedEnv } from "./env.ts";
import { createOryKratosApp } from "./app.ts";
import type { IdentityServiceCallbacks } from "./callbacks.ts";

export interface StartOryKratosServiceOptions {
  callbacks?: IdentityServiceCallbacks;
}

export function startOryKratosService(options?: StartOryKratosServiceOptions) {
  const { log, logError } = makeSubsystemReporters(
    "init",
    "startOryKratosService",
  );
  try {
    log.info(
      `Starting Ory Kratos courier server at ${typedEnv.KRATOS_COURIER_HTTP_HOST}`,
    );
    const app = createOryKratosApp({ callbacks: options?.callbacks });

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

export { createOryKratosApp } from "./app.ts";
export { createPostKratosCourierHandler } from "./routes/post-kratos-courier.ts";
export type {
  IdentityServiceCallbacks,
  User,
  VerificationTokenCreatedPayload,
  PasswordResetPayload,
  PasswordUpdatedPayload,
} from "./callbacks.ts";
