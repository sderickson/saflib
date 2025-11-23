import { SecretsHealthClient } from "@saflib/secrets-grpc-proto";
import { typedEnv } from "../../env.ts";
import * as grpc from "@grpc/grpc-js";
import { getHealthFake } from "./get-health.fake.ts";

/**
 * A stripped down type of the HealthClient, for easier mocking.
 */
export type LimitedHealthClient = Pick<SecretsHealthClient, "HealthCheck">;

/**
 * The global HealthClient for the secrets service.
 */
let healthClient: LimitedHealthClient = new SecretsHealthClient(
  typedEnv.SECRETS_SERVICE_GRPC_HOST,
  grpc.credentials.createInsecure(),
);

if (typedEnv.NODE_ENV === "test") {
  healthClient = {
    HealthCheck: getHealthFake,
  };
}

export { healthClient };
export { Timestamp } from "@saflib/secrets-grpc-proto";
