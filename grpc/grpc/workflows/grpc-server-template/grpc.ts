// @ts-nocheck - TODO remove this line as part of workflow
import { SERVICE_NAMEDb } from "@saflib/dbs-SERVICE_NAME";
import { type DbKey } from "@saflib/drizzle-sqlite3";
import { SERVICE_NAMEServiceStorage } from "./context.ts";
import { addSafContext, makeGrpcServerContextWrapper } from "@saflib/grpc";
import * as grpc from "@grpc/grpc-js";

interface GrpcServerOptions {
  dbKey?: DbKey;
}

export function makeGrpcServer(options: GrpcServerOptions = {}): grpc.Server {
  let { dbKey } = options;
  if (!dbKey) {
    dbKey = SERVICE_NAMEDb.connect();
  }
  const addSERVICE_NAMEServiceContext = makeGrpcServerContextWrapper(
    SERVICE_NAMEServiceStorage,
    { dbKey },
  );
  const wrap = (impl: any) =>
    addSafContext(addSERVICE_NAMEServiceContext(impl));

  const server = new grpc.Server();

  // TODO: Add service implementations here
  // Example:
  // server.addService(YourServiceDefinition, wrap(YourServiceImpl));

  return server;
}
