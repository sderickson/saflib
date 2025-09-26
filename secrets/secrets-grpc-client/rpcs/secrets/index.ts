import { SecretsClient } from "@saflib/secrets-grpc-proto";
import { typedEnv } from "../../env.ts";
import * as grpc from "@grpc/grpc-js";
import { getSecretFake } from "./get-secret.fake.ts";

/**
 * A stripped down type of the GetSecretSecretsClient, for easier mocking.
 */
export type LimitedSecretsClient = Pick<
  SecretsClient,
  "GetSecret"
>;

/**
 * The global GetSecretSecretsClient for the secrets service.
 */
let secretsClient: LimitedSecretsClient = new SecretsClient(
  `${typedEnv.SECRETS_SERVICE_HOST}:${typedEnv.SECRETS_SERVICE_GRPC_PORT}`,
  grpc.credentials.createInsecure(),
);

if (typedEnv.NODE_ENV === "test") {
  secretsClient = {
    GetSecret: getSecretFake,
  };
}

export { secretsClient };
export {
  GetSecretRequest,
  GetSecretResponse,
} from "@saflib/secrets-grpc-proto";
