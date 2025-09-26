import { secretsDb } from "@saflib/secrets-db";
import { secretsServiceStorage } from "@saflib/secrets-service-common";
import { makeGrpcServerContextWrapper, addSafContext } from "@saflib/grpc";
import * as grpc from "@grpc/grpc-js";
import {
  SecretsHealthService,
  SecretsHealthServiceDefinition,
} from "./handlers/health/index.ts";
import type { SecretsServiceContextOptions } from "@saflib/secrets-service-common";

/**
 * Starts the gRPC server for the @saflib/secrets service.
 */
export function makeGrpcServer(
  options: SecretsServiceContextOptions,
): grpc.Server {
  let { secretsDbKey } = options;
  if (!secretsDbKey) {
    secretsDbKey = secretsDb.connect();
  }
  const addStoreContext = makeGrpcServerContextWrapper(
    secretsServiceStorage,
    { secretsDbKey },
  );

  const server = new grpc.Server();

  // Add services here
  server.addService(
    SecretsHealthServiceDefinition,
    addSafContext(
      addStoreContext(new SecretsHealthService()),
      SecretsHealthServiceDefinition,
    ),
  );

  return server;
}
