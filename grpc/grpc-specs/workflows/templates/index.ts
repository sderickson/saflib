// TODO: Import the generated types from the dist directory
// import * as templateFile from "./dist/template-file.ts";
// import * as timestamp from "./dist/google/protobuf/timestamp.ts";
// import { typedEnv } from "./env.ts";
// import * as grpc from "@grpc/grpc-js";

// TODO: Define a limited client type for easier mocking
// export type LimitedTemplateFileClient = Pick<templateFile.TemplateFileClient, "GetTemplateFile">;

// TODO: Create the global client
// let templateFileClient: LimitedTemplateFileClient = new templateFile.TemplateFileClient(
//   `${typedEnv.TEMPLATE_FILE_SERVICE_HOST}:${typedEnv.TEMPLATE_FILE_SERVICE_GRPC_PORT}`,
//   grpc.credentials.createInsecure(),
// );

// TODO: Add test mocking
// if (typedEnv.NODE_ENV === "test") {
//   templateFileClient = {
//     GetTemplateFile: async (_request: templateFile.GetTemplateFileRequest) => {
//       // Return mock data for testing
//     },
//   };
// }

// TODO: Export the generated types and client
// export { templateFile, timestamp, templateFileClient };
