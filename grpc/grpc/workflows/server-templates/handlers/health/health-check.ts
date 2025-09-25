import {
  __ServiceName__HealthCheckResponse,
  __ServiceName__HealthCheckRequest,
  Timestamp,
} from "template-package-grpc-proto";
import { getSafContext, getSafReporters } from "@saflib/node";

export const handleHealthCheck = (
  _request: __ServiceName__HealthCheckRequest,
): __ServiceName__HealthCheckResponse => {
  const { log } = getSafReporters();
  const { subsystemName, operationName } = getSafContext();
  log.info(`Health check for ${subsystemName} ${operationName}`);

  return new __ServiceName__HealthCheckResponse({
    status: "OK",
    current_time: new Timestamp({
      seconds: Date.now() / 1000,
      nanos: 0,
    }),
  });
};
