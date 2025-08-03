import { startExpressServer } from "@saflib/express";
import { createApp } from "./http.ts";
import { authDb } from "@saflib/identity-db";
import { makeGrpcServer } from "./grpc.ts";
import { startGrpcServer } from "@saflib/grpc-node";
import type { DbOptions } from "@saflib/drizzle-sqlite3";
import type { User } from "@saflib/identity-db";
import type { AuthServiceCallbacks } from "./types.ts";
import { makeSubsystemReporters } from "@saflib/node";
import { typedEnv } from "./env.ts";
export * from "./types.ts";

interface StartAuthServiceOptions {
  dbOptions?: DbOptions;
  callbacks?: AuthServiceCallbacks;
}

export async function startAuthService(options?: StartAuthServiceOptions) {
  const { log, logError } = makeSubsystemReporters("init", "startAuthService");
  try {
    log.info("Starting auth service...");
    log.info("Connecting to auth DB...");
    const dbKey = authDb.connect(options?.dbOptions);
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
    startExpressServer(app, {
      port: parseInt(typedEnv.IDENTITY_SERVICE_HTTP_PORT, 10),
    });
    log.info("Auth service startup complete.");
  } catch (error) {
    logError(error);
  }
}

export type { User };
