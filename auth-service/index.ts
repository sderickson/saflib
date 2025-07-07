import { startExpressServer } from "@saflib/express";
import { createApp } from "./http.ts";
import { authDb } from "@saflib/auth-db";
import { makeGrpcServer } from "./grpc.ts";
import { startGrpcServer } from "@saflib/grpc-node";
import type { DbOptions } from "../drizzle-sqlite3/types.ts";
import type { User } from "@saflib/auth-db";
import type { AuthServiceCallbacks } from "./types.ts";
import { makeSubsystemReporters } from "@saflib/node";
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
    startGrpcServer(grpcServer);

    log.info("Starting express server...");
    const app = createApp({ dbKey, callbacks: options?.callbacks ?? {} });
    startExpressServer(app);
    log.info("Auth service startup complete.");
    // TODO: Remove this
    logError(new Error("Test error"), {
      level: "debug",
      extra: {
        status: "success",
      },
    });
  } catch (error) {
    logError(error);
  }
}

export type { User };
