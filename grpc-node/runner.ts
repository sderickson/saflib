import type {
  handleUnaryCall,
  sendUnaryData,
  ServerErrorResponse,
  ServerUnaryCall,
} from "@grpc/grpc-js";
import { status, type StatusObject } from "@grpc/grpc-js";
import { getSafReporters, getSafContext } from "@saflib/node";
import { grpcMetric, type GrpcLabels } from "./metrics.ts";

/**
 * Two roles:
 *   - record duration and status codes to metrics
 *   - handle and log errors, including uncaught exceptions
 */
export function runGrpcMethod(
  methodImpl: handleUnaryCall<any, any>,
  call: ServerUnaryCall<any, any>,
  originalCallback: sendUnaryData<any>,
) {
  const { logError } = getSafReporters();
  const { subsystemName, operationName, serviceName } = getSafContext();

  const labels: GrpcLabels = {
    service_name: serviceName,
    status_code: -1,
    grpc_service: subsystemName,
    method: operationName,
  };

  const timer = grpcMetric.startTimer(labels);
  const callback = (
    error: ServerErrorResponse | Partial<StatusObject> | null,
    value: any,
  ) => {
    if (error) {
      labels.status_code = error.code ?? status.INTERNAL;
    } else {
      labels.status_code = status.OK;
    }
    timer();
    originalCallback(error, value);
  };

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
