import * as health from "../dist/health.ts";
import * as timestamp from "../dist/google/protobuf/timestamp.ts";
import * as grpc from "@grpc/grpc-js";
import { typedEnv } from "../env.ts";

/**
 * A stripped down type of the HealthClient, for easier mocking.
 */
export type LimitedHealthClient = Pick<health.HealthClient, "HealthCheck">;

const getHealthClient = (address: string) => {
  let healthClient: LimitedHealthClient = new health.HealthClient(
    address,
    grpc.credentials.createInsecure(),
  );

  if (typedEnv.NODE_ENV === "test") {
    healthClient = {
      HealthCheck: async (_request: health.HealthCheckRequest) => {
        return new health.HealthCheckResponse({
          status: "OK",
          current_time: new timestamp.Timestamp({
            seconds: 1718239200,
            nanos: 0,
          }),
        });
      },
    };
  }
  return healthClient;
};

export { health, timestamp, getHealthClient };
