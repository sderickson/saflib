import { typedEnv } from "./env.ts";

const templateFileAddress = `${typedEnv.TEMPLATE_FILE_SERVICE_HOST}:${typedEnv.TEMPLATE_FILE_SERVICE_GRPC_PORT}`;

// import, create, and export clients here

export { templateFileAddress };
