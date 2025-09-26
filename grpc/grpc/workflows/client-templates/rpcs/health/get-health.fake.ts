import {
  __ServiceName__HealthCheckRequest,
  __ServiceName__HealthCheckResponse,
  Timestamp,
} from "template-package-grpc-proto";

/**
 * Fake implementation of the HealthCheck RPC for testing.
 */
export const getHealthFake = async (
  _request: __ServiceName__HealthCheckRequest,
): Promise<__ServiceName__HealthCheckResponse> => {
  return new __ServiceName__HealthCheckResponse({
    status: "healthy",
    current_time: new Timestamp({
      seconds: Math.floor(Date.now() / 1000),
      nanos: 0,
    }),
  });
};
