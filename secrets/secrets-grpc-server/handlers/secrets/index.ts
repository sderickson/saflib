import { handleGetSecret } from "./get-secret.ts";
import { handleRegisterToken } from "./register-token.ts";
import { UnimplementedSecretsService } from "@saflib/secrets-grpc-proto";
import { wrapSimpleHandler } from "@saflib/grpc";

export const SecretsDefinition = UnimplementedSecretsService.definition;

export class SecretsService extends UnimplementedSecretsService {
  GetSecret = wrapSimpleHandler(handleGetSecret);
  RegisterToken = wrapSimpleHandler(handleRegisterToken);
}
