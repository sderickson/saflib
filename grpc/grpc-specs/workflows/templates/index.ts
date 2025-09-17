import { getHealthClient, health } from "./clients/health.ts";
import { typedEnv } from "./env.ts";

const templateFileAddress = `${typedEnv.TEMPLATE_FILE_SERVICE_HOST}:${typedEnv.TEMPLATE_FILE_SERVICE_GRPC_PORT}`;

const healthClient = getHealthClient(templateFileAddress);

export { templateFileAddress, healthClient, health };
