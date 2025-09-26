import {
  RegisterTokenResponse,
  RegisterTokenRequest,
  Timestamp,
} from "@saflib/secrets-grpc-proto";
import { getSafContext, getSafReporters } from "@saflib/node";

export const handleRegisterToken = (
  _request: RegisterTokenRequest,
): RegisterTokenResponse => {
  const { log } = getSafReporters();
  const { subsystemName, operationName } = getSafContext();
  log.info(`Call to ${subsystemName} - ${operationName}`);

  return new RegisterTokenResponse({
    status: "OK",
    timestamp: new Timestamp({
      seconds: Date.now() / 1000,
      nanos: 0,
    }),
  });
};
