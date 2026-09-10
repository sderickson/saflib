import { startExpressServer } from "@saflib/express";
import { makeSubsystemReporters } from "@saflib/node";
import { typedEnv } from "./env.ts";
import { createOryKratosApp } from "./app.ts";
import type { KratosActionHandler } from "./actions.ts";
import type { KratosCourierCallbacks } from "./courier-callbacks.ts";

export interface StartOryKratosServiceOptions {
  courierCallbacks?: KratosCourierCallbacks;
  /**
   * @deprecated Use {@link StartOryKratosServiceOptions.courierCallbacks} instead.
   * If both are set, `courierCallbacks` wins.
   */
  callbacks?: KratosCourierCallbacks;
  actionHandler?: KratosActionHandler;
}

export function startOryKratosService(options?: StartOryKratosServiceOptions) {
  const { log, logError } = makeSubsystemReporters(
    "init",
    "startOryKratosService",
  );
  try {
    log.info(
      `Starting Ory Kratos courier server at ${typedEnv.KRATOS_HANDLER_HTTP_HOST}`,
    );
    const app = createOryKratosApp({
      courierCallbacks: options?.courierCallbacks,
      callbacks: options?.callbacks,
      actionHandler: options?.actionHandler,
    });

    const port = parseInt(
      typedEnv.KRATOS_HANDLER_HTTP_HOST.split(":")[1] || "80",
      10,
    );
    startExpressServer(app, { port });
    log.info("Ory Kratos courier server startup complete.");
  } catch (error) {
    logError(error);
    console.error(error);
  }
}

export {
  createOryKratosApp,
  type CreateOryKratosAppOptions,
} from "./app.ts";
export { makePostKratosActionHandler } from "./post-kratos-action.ts";
export { createPostKratosCourierHandler } from "./routes/post-kratos-courier.ts";
export { resolveAuthFromIdentityId } from "./resolveAuthFromIdentityId.ts";
export {
  kratosAdminBaseUrl,
  resolveUserIdByEmail,
  fetchKratosIdentityById,
  resolveEmailFromIdentityId,
} from "@saflib/express/kratos-admin";
export type {
  KratosAction,
  KratosActionContext,
  KratosActionHandler,
} from "./actions.ts";
export type {
  KratosCourierCallbacks,
  KratosCourierTemplateId,
  User,
  RecoveryCodeValidPayload,
  RecoveryValidPayload,
  VerificationCodeValidPayload,
  VerificationValidPayload,
  LoginCodeValidPayload,
  RegistrationCodeValidPayload,
} from "./courier-callbacks.ts";
