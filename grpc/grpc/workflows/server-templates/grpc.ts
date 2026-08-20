import { __serviceName__Db } from "@saflib/base-db/instances";
import { __serviceName__ServiceStorage } from "@saflib/base-service-common/context";
import { makeGrpcServerContextWrapper, addSafContext } from "@saflib/grpc";
import * as grpc from "@grpc/grpc-js";
import {
  __ServiceName__HealthService,
  __ServiceName__HealthServiceDefinition,
} from "./handlers/health/index.ts";
import type { __ServiceName__ServiceContextOptions } from "@saflib/base-service-common/context";

/**
 * Starts the gRPC server for the template-package service.
 */
export function makeGrpcServer(
  options: __ServiceName__ServiceContextOptions,
): grpc.Server {
  let { __serviceName__DbKey } = options;
  if (!__serviceName__DbKey) {
    __serviceName__DbKey = __serviceName__Db.connect();
  }
  const addStoreContext = makeGrpcServerContextWrapper(
    __serviceName__ServiceStorage,
    { __serviceName__DbKey },
  );

  const server = new grpc.Server();

  // Add services here
  server.addService(
    __ServiceName__HealthServiceDefinition,
    addSafContext(
      addStoreContext(new __ServiceName__HealthService()),
      __ServiceName__HealthServiceDefinition,
    ),
  );

  return server;
}
