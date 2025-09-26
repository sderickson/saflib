import { handleHealthCheck } from "./health-check.ts";
import { UnimplementedSecretsHealthService } from "@saflib/secrets-grpc-proto";
import { wrapSimpleHandler } from "@saflib/grpc";

export const SecretsHealthServiceDefinition =
  UnimplementedSecretsHealthService.definition;

export class SecretsHealthService extends UnimplementedSecretsHealthService {
  HealthCheck = wrapSimpleHandler(handleHealthCheck);
}
