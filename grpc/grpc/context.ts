import type {
  UntypedServiceImplementation,
  UntypedHandleCall,
  handleUnaryCall,
  ServiceDefinition,
} from "@grpc/grpc-js";
import type { ServiceImplementationWrapper } from "./server.ts";
import {
  type Auth,
  type SafContext,
  safContextStorage,
  type SafReporters,
  safReportersStorage,
  getServiceName,
} from "@saflib/node";
import { SafAuth } from "@saflib/grpc";
import { createLogger } from "@saflib/node";
import { AsyncLocalStorage } from "async_hooks";
import { defaultErrorReporter } from "@saflib/node";
import { runGrpcMethod } from "./runner.ts";

/**
 * Takes a gRPC service and wraps it to provide SafContext and SafReporters for each request.
 */
export const addSafContext = (
  impl: UntypedServiceImplementation,
  _definition: ServiceDefinition,
) => {
  const wrappedService: UntypedServiceImplementation = {};

  for (const [methodName, methodImpl] of Object.entries(impl)) {
    const impl = methodImpl as handleUnaryCall<any, any>;
    const wrappedMethod: handleUnaryCall<any, any> = (call, callback) => {
      // Create the context for this request
      const reqId: string = call.request?.request?.id || "no-request-id";
      let auth: Auth | undefined = undefined;
      const authFromRequest = call.request.auth;
      if (authFromRequest instanceof SafAuth) {
        if (
          !authFromRequest.user_id ||
          !authFromRequest.user_email ||
          !authFromRequest.user_scopes
        ) {
          throw new Error("Invalid auth context");
        }
        auth = {
          userId: authFromRequest.user_id,
          userEmail: authFromRequest.user_email,
          userScopes: authFromRequest.user_scopes,
        };
      }
      const context: SafContext = {
        requestId: reqId,
        serviceName: getServiceName(),
        subsystemName: "grpc",
        operationName: methodName,
        auth,
      };
      const logger = createLogger(context);
      const reporters: SafReporters = {
        log: logger,
        logError: defaultErrorReporter,
      };
      // Run the original implementation within the context
      return safContextStorage.run(context, () => {
        return safReportersStorage.run(reporters, () => {
          runGrpcMethod(impl, call, callback);
        });
      });
    };
    wrappedService[methodName] = wrappedMethod;
  }
  return wrappedService;
};

/**
 * Takes a storage and context and returns a function which will wrap a gRPC service implementation and provide the given storage/context for each request.
 * It returns a wrapper function so it can be used for each service added to the gRPC server, which presumably all need the same context and storage.
 */
export function makeGrpcServerContextWrapper(
  storage: AsyncLocalStorage<any>,
  context: any,
) {
  const wrapper: ServiceImplementationWrapper = (impl) => {
    const wrappedService: UntypedServiceImplementation = {};

    for (const [methodName, methodImpl] of Object.entries(impl)) {
      const wrappedMethod: UntypedHandleCall = (call: any, callback: any) => {
        return storage.run(context, () => {
          return methodImpl(call, callback);
        });
      };
      wrappedService[methodName] = wrappedMethod;
    }
    return wrappedService;
  };
  return wrapper;
}
