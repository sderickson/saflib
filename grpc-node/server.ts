import * as grpc from "@grpc/grpc-js";
import type { UntypedServiceImplementation } from "@grpc/grpc-js";
import { typedEnv } from "./env.ts";

interface GrpcServerOptions {
  interceptors?: grpc.ServerInterceptor[];
  port: number;
}

export type ServiceImplementationWrapper = (
  impl: UntypedServiceImplementation,
) => UntypedServiceImplementation;

export async function startGrpcServer(
  server: grpc.Server,
  options: GrpcServerOptions,
) {
  const port = options.port;
  if (isNaN(port)) {
    throw new Error(`Invalid grpc port: ${port}.`);
  }

  let resolve: () => void;
  let reject: (err: Error) => void;
  const p = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(), // Using insecure for now
    (err, _boundPort) => {
      if (err) {
        reject(err);
      }
      if (typedEnv.NODE_ENV !== "test") {
        console.log(`gRPC server bound to port ${port}`);
      }
      resolve();
    },
  );
  await p;

  // Graceful shutdown handler
  const shutdown = () => {
    if (typedEnv.NODE_ENV !== "test") {
      console.log("Received shutdown signal, closing gRPC server...");
    }
    server.tryShutdown((error) => {
      if (error) {
        console.error("Error shutting down gRPC server:", error);
        process.exit(1); // Exit with error on shutdown failure
      } else {
        console.log("gRPC server shut down successfully.");
        process.exit(0); // Exit cleanly
      }
    });
    // Add a timeout for forceful shutdown if tryShutdown hangs
    setTimeout(() => {
      console.error("gRPC shutdown timed out. Forcing exit.");
      process.exit(1);
    }, 5000); // 5 seconds timeout
  };

  // Listen for shutdown signals
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
