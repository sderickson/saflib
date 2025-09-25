export * from "./dist/health.ts";

import { typedEnv } from "./env.ts";

export const __serviceName__GrpcAddress = `${typedEnv.__SERVICE_NAME___SERVICE_HOST}:${typedEnv.__SERVICE_NAME___SERVICE_GRPC_PORT}`;
