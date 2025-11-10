export * from "./dist/health/index.ts";
export * from "./dist/health/get-health.ts";
export * from "./dist/__group_name__/index.ts"; // DELETE_THIS_LINE
export * from "./dist/__group_name__/__target_name__.ts"; // DELETE_THIS_LINE
export * from "./dist/google/protobuf/timestamp.ts";

import { typedEnv } from "./env.ts";

export const __serviceName__GrpcAddress =
  typedEnv.__SERVICE_NAME___SERVICE_GRPC_HOST;
