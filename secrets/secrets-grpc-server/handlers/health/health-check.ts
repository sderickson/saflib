import {
  SecretsHealthCheckResponse,
  SecretsHealthCheckRequest,
  Timestamp,
} from "@saflib/secrets-grpc-proto";
import { getSafContext, getSafReporters } from "@saflib/node";

export const handleHealthCheck = async (
  _request: SecretsHealthCheckRequest,
): Promise<SecretsHealthCheckResponse> => {
  const { log } = getSafReporters();
  const { subsystemName, operationName } = getSafContext();
  log.info(`Health check for ${subsystemName} ${operationName}`);

  return new SecretsHealthCheckResponse({
    status: "OK",
    current_time: new Timestamp({
      seconds: Date.now() / 1000,
      nanos: 0,
    }),
  });
};
