import {
  SecretsHealthCheckRequest,
  SecretsHealthCheckResponse,
  Timestamp,
} from "@saflib/secrets-grpc-proto";

/**
 * Fake implementation of the HealthCheck RPC for testing.
 */
export const getHealthFake = async (
  _request: SecretsHealthCheckRequest,
): Promise<SecretsHealthCheckResponse> => {
  return new SecretsHealthCheckResponse({
    status: "healthy",
    current_time: new Timestamp({
      seconds: Math.floor(Date.now() / 1000),
      nanos: 0,
    }),
  });
};
