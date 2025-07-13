import type {
  handleUnaryCall,
  sendUnaryData,
  ServerUnaryCall,
} from "@grpc/grpc-js";
import { status } from "@grpc/grpc-js";
import { getSafReporters } from "@saflib/node";
// import { grpcMetric } from "./metrics.ts";

export function runGrpcMethod(
  methodImpl: handleUnaryCall<any, any>,
  call: ServerUnaryCall<any, any>,
  // originalCallback: sendUnaryData<any>,
  callback: sendUnaryData<any>,
) {
  const { logError } = getSafReporters();

  // grpcMetric.startTimer();
  // const start = Date.now();
  // const callback = (error: any, value: any) => {
  //   const duration = Date.now() - start;
  //   grpcMetric.observe(duration, {
  //     status_code: error ? status.INTERNAL : status.OK,
  //     grpc_service: call.service,
  //     grpc_method: call.method,
  //   });
  //   originalCallback(error, value);
  // };
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
