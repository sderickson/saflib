import { startExpressServer } from "@saflib/express";
import { createApp } from "./http.ts";
import { authDb } from "@saflib/auth-db";
import { makeGrpcServer } from "./grpc.ts";
import { startGrpcServer } from "@saflib/grpc-node";
import type { DbOptions } from "../drizzle-sqlite3/types.ts";
import type { User } from "@saflib/auth-db";
import type { AuthServiceCallbacks } from "./types.ts";
import { createLogger } from "@saflib/node";
export * from "./types.ts";

interface StartAuthServiceOptions {
  dbOptions?: DbOptions;
  callbacks?: AuthServiceCallbacks;
}

export async function startAuthService(options?: StartAuthServiceOptions) {
  const logger = createLogger({
    serviceName: "auth",
    operationName: "startAuthService",
    requestId: "",
  });
  logger.info("Starting auth service...");
  logger.info("Connecting to auth DB...");
  const dbKey = authDb.connect(options?.dbOptions);
  logger.info("Starting gRPC server...");
  const grpcServer = makeGrpcServer({
    dbKey,
    callbacks: options?.callbacks ?? {},
  });
  startGrpcServer(grpcServer);

  logger.info("Starting express server...");
  const app = createApp({ dbKey, callbacks: options?.callbacks ?? {} });
  startExpressServer(app);
  logger.info("Auth service startup complete.");
}

export type { User };
