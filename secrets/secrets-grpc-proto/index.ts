export * from "./dist/health/index.ts";
export * from "./dist/health/get-health.ts";
export * from "./dist/secrets/index.ts";
export * from "./dist/secrets/get-secret.ts";
export * from "./dist/secrets/register-token.ts";

export * from "./dist/google/protobuf/timestamp.ts";

import { typedEnv } from "./env.ts";

export const secretsGrpcAddress = `${typedEnv.SECRETS_SERVICE_GRPC_HOST}`;
