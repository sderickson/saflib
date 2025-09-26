import { handleHealthCheck } from "./health-check.ts";
import { Unimplemented__ServiceName__HealthService } from "template-package-grpc-proto";
import { wrapSimpleHandler } from "@saflib/grpc";

export const __ServiceName__HealthServiceDefinition =
  Unimplemented__ServiceName__HealthService.definition;

export class __ServiceName__HealthService extends Unimplemented__ServiceName__HealthService {
  HealthCheck = wrapSimpleHandler(handleHealthCheck);
}
