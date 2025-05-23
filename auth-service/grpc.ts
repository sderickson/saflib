import { authDb } from "@saflib/auth-db";
import { type DbKey } from "@saflib/drizzle-sqlite3";
import { authServiceStorage } from "./context.ts";
import { addSafContext, makeGrpcServerContextWrapper } from "@saflib/grpc-node";
import * as grpc from "@grpc/grpc-js";

interface GrpcServerOptions {
  dbKey?: DbKey;
}

export function makeGrpcServer(options: GrpcServerOptions = {}): grpc.Server {
  let { dbKey } = options;
  if (!dbKey) {
    dbKey = authDb.connect();
  }
  const addauthServiceContext = makeGrpcServerContextWrapper(
    authServiceStorage,
    { dbKey },
  );
  const wrap = (impl: any) => addSafContext(addauthServiceContext(impl));

  const server = new grpc.Server();

  // TODO: Add service implementations here
  // Example:
  // server.addService(YourServiceDefinition, wrap(YourServiceImpl));

  return server;
}
