import { templateFileDb } from "@template/file-db";
import { templateFileServiceStorage } from "@template/file-service-common";
import { makeGrpcServerContextWrapper } from "@saflib/grpc";
import * as grpc from "@grpc/grpc-js";
import type { TemplateFileServiceContextOptions } from "@template/file-service-common";

/**
 * Starts the gRPC server for the template-file service.
 */
export function makeGrpcServer(
  options: TemplateFileServiceContextOptions,
): grpc.Server {
  let { templateFileDbKey } = options;
  if (!templateFileDbKey) {
    templateFileDbKey = templateFileDb.connect();
  }
  const addTemplateFileServiceContext = makeGrpcServerContextWrapper(
    templateFileServiceStorage,
    { templateFileDbKey },
  );
  // TODO: remove this check once context is being used for a service
  if (!addTemplateFileServiceContext) {
    throw new Error("addTemplateFileServiceContext is not defined");
  }

  const server = new grpc.Server();

  // Add services here

  return server;
}
