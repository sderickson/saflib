import type {
  handleUnaryCall,
  sendUnaryData,
  ServerUnaryCall,
} from "@grpc/grpc-js";
import { status } from "@grpc/grpc-js";
import { getSafReporters } from "@saflib/node";

export function runGrpcMethod(
  methodImpl: handleUnaryCall<any, any>,
  call: ServerUnaryCall<any, any>,
  callback: sendUnaryData<any>,
) {
  const { logError } = getSafReporters();
  try {
    const result = methodImpl(call, callback) as any;
    if (result instanceof Promise) {
      return result.catch((error) => {
        const e = error as Error;
        logError(e);
        callback({ code: status.INTERNAL, message: e.message } as any, null);
      });
    }
    return result;
  } catch (error) {
    const e = error as Error;
    logError(e);
    callback({ code: status.INTERNAL, message: e.message } as any, null);
  }
}
