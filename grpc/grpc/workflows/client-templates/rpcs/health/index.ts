import { __ServiceName__HealthClient } from "template-package-grpc-proto";
import { typedEnv } from "../../env.ts";
import * as grpc from "@grpc/grpc-js";
import { getHealthFake } from "./get-health.fake.ts";

/**
 * A stripped down type of the HealthClient, for easier mocking.
 */
export type LimitedHealthClient = Pick<
  __ServiceName__HealthClient,
  "HealthCheck"
>;

/**
 * The global HealthClient for the __service_name__ service.
 */
let healthClient: LimitedHealthClient = new __ServiceName__HealthClient(
  `${typedEnv.__SERVICE_NAME___SERVICE_HOST}:${typedEnv.__SERVICE_NAME___SERVICE_GRPC_PORT}`,
  grpc.credentials.createInsecure(),
);

if (typedEnv.NODE_ENV === "test") {
  healthClient = {
    HealthCheck: getHealthFake,
  };
}

export { Timestamp } from "template-package-grpc-proto";
