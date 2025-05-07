import * as grpc from "@grpc/grpc-js";
import { UntypedServiceImplementation } from "@grpc/grpc-js";

// Define an interface for the service definition and implementation pairs
interface GrpcService {
  serviceDefinition: grpc.ServiceDefinition<grpc.UntypedServiceImplementation>;
  implementation: grpc.UntypedServiceImplementation;
}

interface GrpcServerOptions {
  interceptors?: grpc.ServerInterceptor[];
}

export type ServiceImplementationWrapper = (
  impl: UntypedServiceImplementation,
) => UntypedServiceImplementation;

/**
 * Creates, configures, and starts a gRPC server, handling graceful shutdown.
 * Reads GRPC_PORT from environment variables, defaulting to 50051.
 *
 * @param services An array of service definitions and their implementations.
 */
export function startGrpcServer(
  services: GrpcService[],
  options: GrpcServerOptions = {},
): grpc.Server {
  const port = process.env.GRPC_PORT
    ? parseInt(process.env.GRPC_PORT, 10)
    : 50051;
  if (isNaN(port)) {
    console.error(
      `Invalid GRPC_PORT: ${process.env.GRPC_PORT}. Using default 50051.`,
    );
    // Or throw an error, depending on desired strictness
  }
  const effectivePort = isNaN(port) ? 50051 : port;

  console.log("Initializing gRPC server...");
  const server = new grpc.Server({
    interceptors: options.interceptors || [],
  });

  // Register all provided RPC service handlers
  services.forEach((serviceInfo) => {
    console.log(
      `Registering gRPC service: ${Object.keys(serviceInfo.serviceDefinition)}`,
    );
    server.addService(
      serviceInfo.serviceDefinition,
      serviceInfo.implementation,
    );
  });

  // Bind the server asynchronously
  console.log("Binding gRPC server to port", effectivePort);
  server.bindAsync(
    `0.0.0.0:${effectivePort}`,
    grpc.ServerCredentials.createInsecure(), // Using insecure for now
    (err, boundPort) => {
      if (err) {
        console.error(
          `gRPC server binding failed on port ${effectivePort}:`,
          err,
        );
        // Consider exiting or throwing if binding fails critically
        process.exit(1); // Exit if binding fails
        return;
      }
      console.log(`gRPC server started on port ${boundPort}`);
    },
  );

  // Graceful shutdown handler
  const shutdown = () => {
    console.log("Received shutdown signal, closing gRPC server...");
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

  // Handle server errors (optional but good practice)
  // server.on('error', (err) => { // Note: grpc.Server doesn't directly emit 'error' like http.Server
  //   console.error("gRPC Server Error:", err);
  // });

  return server; // Return the server instance if needed elsewhere
}
