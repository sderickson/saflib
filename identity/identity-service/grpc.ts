import { authDb } from "@saflib/identity-db";
import { authServiceStorage } from "./context.ts";
import { addSafContext, makeGrpcServerContextWrapper } from "@saflib/grpc-node";
import * as grpc from "@grpc/grpc-js";
import { UsersServiceDefinition, UsersService } from "./rpcs/users/index.ts";
import type { AuthServerOptions } from "./types.ts";

export function makeGrpcServer(options: AuthServerOptions): grpc.Server {
  let { dbKey } = options;
  if (!dbKey) {
    dbKey = authDb.connect();
  }
  const addAuthServiceContext = makeGrpcServerContextWrapper(
    authServiceStorage,
    { dbKey, callbacks: options.callbacks },
  );

  const server = new grpc.Server();

  // TODO: Improve the ergonomics of this. Maybe addSafService(service, )
  server.addService(
    UsersService.definition,
    addSafContext(
      addAuthServiceContext(new UsersService()),
      UsersServiceDefinition,
    ),
  );

  return server;
}
