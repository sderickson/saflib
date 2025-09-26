import { handle__TargetName__ } from "./__target-name__.ts";
import { Unimplemented__GroupName__Service } from "template-package-grpc-proto";
import { wrapSimpleHandler } from "@saflib/grpc";

export const __GroupName__Definition =
  Unimplemented__GroupName__Service.definition;

export class __GroupName__Service extends Unimplemented__GroupName__Service {
  __TargetName__ = wrapSimpleHandler(handle__TargetName__);
}
