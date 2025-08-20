import type {
  UntypedServiceImplementation,
  UntypedHandleCall,
  handleUnaryCall,
  ServiceDefinition,
} from "@grpc/grpc-js";
import type { ServiceImplementationWrapper } from "@saflib/grpc";
import {
  type Auth,
  type SafContext,
  safContextStorage,
  type SafReporters,
  safReportersStorage,
  getServiceName,
} from "@saflib/node";
import { SafAuth } from "@saflib/grpc-specs";
import { createLogger } from "@saflib/node";
import { AsyncLocalStorage } from "async_hooks";
import { defaultErrorReporter } from "@saflib/node";
import { runGrpcMethod } from "./runner.ts";

export type SafServiceImplementationWrapper = (
  impl: UntypedServiceImplementation,
  definition: ServiceDefinition,
) => UntypedServiceImplementation;

export const addSafContext: SafServiceImplementationWrapper = (
  impl,
  _definition,
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
