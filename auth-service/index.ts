import { startExpressServer } from "@saflib/express";
import { createApp } from "./app.ts";
import { authDb } from "@saflib/auth-db";
import { makeGrpcServer } from "./grpc.ts";
import { startGrpcServer } from "@saflib/grpc-node";
import type { DbOptions } from "../drizzle-sqlite3/types.ts";
import type { User } from "@saflib/auth-db";
import type { AuthServiceCallbacks } from "./types.ts";

interface StartAuthServiceOptions {
  dbOptions?: DbOptions;
  callbacks?: AuthServiceCallbacks;
}

export async function startAuthService(options?: StartAuthServiceOptions) {
  const dbKey = authDb.connect(options?.dbOptions);
  const grpcServer = makeGrpcServer({
    dbKey,
    callbacks: options?.callbacks ?? {},
  });
  startGrpcServer(grpcServer);

  const app = createApp({ dbKey, callbacks: options?.callbacks ?? {} });
  startExpressServer(app);
}

export type { User };
