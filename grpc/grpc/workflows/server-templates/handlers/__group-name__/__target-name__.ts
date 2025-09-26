import {
  __TargetName__Response,
  __TargetName__Request,
  Timestamp,
} from "template-package-grpc-proto";
import { getSafContext, getSafReporters } from "@saflib/node";

export const handle__TargetName__ = async (
  _request: __TargetName__Request,
): Promise<__TargetName__Response> => {
  const { log } = getSafReporters();
  const { subsystemName, operationName } = getSafContext();
  log.info(`Call to ${subsystemName} - ${operationName}`);

  return new __TargetName__Response({
    status: "OK",
    timestamp: new Timestamp({
      seconds: Date.now() / 1000,
      nanos: 0,
    }),
  });
};
