import {
  GetSecretResponse,
  GetSecretRequest,
  Timestamp,
} from "@saflib/secrets-grpc-proto";
import { getSafContext, getSafReporters } from "@saflib/node";

export const handleGetSecret = (
  _request: GetSecretRequest,
): GetSecretResponse => {
  const { log } = getSafReporters();
  const { subsystemName, operationName } = getSafContext();
  log.info(`Call to ${subsystemName} - ${operationName}`);

  return new GetSecretResponse({
    status: "OK",
    timestamp: new Timestamp({
      seconds: Date.now() / 1000,
      nanos: 0,
    }),
  });
};
