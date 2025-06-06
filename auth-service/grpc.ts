import { authDb } from "@saflib/auth-db";
import { authServiceStorage } from "./context.ts";
import { addSafContext, makeGrpcServerContextWrapper } from "@saflib/grpc-node";
import * as grpc from "@grpc/grpc-js";
import {
  UsersServiceDefinition,
  UsersServiceImpl,
} from "./rpcs/users/index.ts";
import { AuthServerOptions } from "./types.ts";

export function makeGrpcServer(options: AuthServerOptions): grpc.Server {
  let { dbKey } = options;
  if (!dbKey) {
    dbKey = authDb.connect();
  }
  const addauthServiceContext = makeGrpcServerContextWrapper(
    authServiceStorage,
    { dbKey, callbacks: options.callbacks },
  );
  const wrap = (impl: any) => addSafContext(addauthServiceContext(impl));

  const server = new grpc.Server();

  server.addService(UsersServiceDefinition, wrap(UsersServiceImpl));

  return server;
}
