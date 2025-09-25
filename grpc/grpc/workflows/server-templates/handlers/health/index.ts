import type { sendUnaryData, ServerUnaryCall } from "@grpc/grpc-js";
import { handleHealthCheck } from "./health-check.ts";
import { Unimplemented__ServiceName__HealthService } from "template-package-grpc-proto";

const wrapSimpleHandler = <Request, Response>(
  handler: (request: Request) => Response,
) => {
  return async (
    call: ServerUnaryCall<Request, Response>,
    callback: sendUnaryData<Response>,
  ) => {
    const response = handler(call.request as Request);
    callback(null, response);
  };
};

export const __ServiceName__HealthServiceDefinition =
  Unimplemented__ServiceName__HealthService.definition;

export class __ServiceName__HealthService extends Unimplemented__ServiceName__HealthService {
  HealthCheck = wrapSimpleHandler(handleHealthCheck);
}
