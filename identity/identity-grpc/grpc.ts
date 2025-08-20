import { identityDb } from "@saflib/identity-db";
import { authServiceStorage } from "@saflib/identity-common";
import { addSafContext, makeGrpcServerContextWrapper } from "@saflib/grpc";
import * as grpc from "@grpc/grpc-js";
import { UsersServiceDefinition, UsersService } from "./rpcs/users/index.ts";
import type { IdentityServerOptions } from "../identity-common/types.ts";

/**
 * Starts the gRPC server for the identity service.
 */
export function makeGrpcServer(options: IdentityServerOptions): grpc.Server {
  let { dbKey } = options;
  if (!dbKey) {
    dbKey = identityDb.connect();
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
