import type {
  UntypedServiceImplementation,
  UntypedHandleCall,
} from "@grpc/grpc-js";
import type { ServiceImplementationWrapper } from "@saflib/grpc-node";
import { type Auth, type SafContext, safStorage } from "@saflib/node";
import { SafAuth } from "@saflib/grpc-specs";
import { createLogger } from "@saflib/node";
import { status } from "@grpc/grpc-js";
import { AsyncLocalStorage } from "async_hooks";

export const addSafContext: ServiceImplementationWrapper = (impl) => {
  const wrappedService: UntypedServiceImplementation = {};

  for (const [methodName, methodImpl] of Object.entries(impl)) {
    const wrappedMethod: UntypedHandleCall = (call: any, callback: any) => {
      // Create the context for this request
      const reqId = call.request?.request?.id || "no-request-id";
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
          userEmailVerified: false, // TODO: propagate
        };
      }
      const context: SafContext = {
        requestId: reqId,
        log: createLogger(reqId),
        auth,
      };
      // Run the original implementation within the context
      return safStorage.run(context, () => {
        try {
          const result = methodImpl(call, callback) as any;
          if (result instanceof Promise) {
            return result.catch((error) => {
              const e = error as Error;
              context.log.error(
                `Error in ${methodName}: ${e.message}\n${e.stack}`,
              );
              callback(
                { code: status.INTERNAL, message: e.message } as any,
                null,
              );
            });
          }
          return result;
        } catch (error) {
          const e = error as Error;
          context.log.error(`Error in ${methodName}: ${e.message}\n${e.stack}`);
          callback({ code: status.INTERNAL, message: e.message } as any, null);
        }
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
