import { startExpressServer } from "@saflib/express";
import { createApp } from "@saflib/identity-http";
import { identityDb } from "@saflib/identity-db";
import { makeGrpcServer } from "@saflib/identity-grpc";
import { startGrpcServer } from "@saflib/grpc";
import type { DbOptions } from "@saflib/drizzle";
import type { User } from "@saflib/identity-db";
import type { IdentityServiceCallbacks } from "@saflib/identity-common";
import { makeSubsystemReporters } from "@saflib/node";
import { typedEnv } from "./env.ts";

/**
 * Callbacks for events which occur in the auth service.
 */
export type { IdentityServiceCallbacks };

/**
 * Options for starting the auth service, including both HTTP and gRPC servers.
 */
export interface StartIdentityServiceOptions {
  dbOptions?: DbOptions;
  callbacks?: IdentityServiceCallbacks;
}

/**
 * Start the auth service, including both HTTP and gRPC servers.
 */
export async function startIdentityService(
  options?: StartIdentityServiceOptions,
) {
  const { log, logError } = makeSubsystemReporters(
    "init",
    "startIdentityService",
  );
  try {
    log.info("Starting identity service...");
    log.info("Connecting to identity DB...");
    const dbKey = identityDb.connect(options?.dbOptions);
    log.info("Starting gRPC server...");
    const grpcServer = makeGrpcServer({
      dbKey,
      callbacks: options?.callbacks ?? {},
    });
    startGrpcServer(grpcServer, {
      port: parseInt(typedEnv.IDENTITY_SERVICE_GRPC_PORT, 10),
    });

    log.info("Starting express server...");
    const app = createApp({ dbKey, callbacks: options?.callbacks ?? {} });
    const port = parseInt(typedEnv.IDENTITY_SERVICE_HOST.split(":")[1] || "80", 10);
    startExpressServer(app, { port });
    log.info("Identity service startup complete.");
  } catch (error) {
    logError(error);
    console.error(error);
  }
}

/**
 * The underlying user model, provided to callbacks.
 */
export type { User };
