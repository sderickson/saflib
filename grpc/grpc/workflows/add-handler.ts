import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  defineWorkflow,
  step,
  type ParsePathOutput,
  type ParsePackageNameOutput,
  getPackageName,
  makeLineReplace,
} from "@saflib/workflows";
import path from "node:path";
import { parsePath, parsePackageName } from "@saflib/workflows";

const sourceDir = path.join(
  import.meta.dirname,
  "server-templates/handlers/__group-name__",
);

const input = [
  {
    name: "path",
    description:
      "The path to the gRPC service package (e.g., './handlers/secrets/get-secret.ts')",
    exampleValue: "./handlers/secrets/get-secret.ts",
  },
] as const;

interface AddGrpcServerHandlerWorkflowContext
  extends ParsePathOutput,
    ParsePackageNameOutput {}

export const AddGrpcServerHandlerWorkflowDefinition = defineWorkflow<
  typeof input,
  AddGrpcServerHandlerWorkflowContext
>({
  id: "grpc/add-handler",

  description: "Implement a gRPC handler for a service",

  checklistDescription: ({ targetName }) =>
    `Implement a gRPC handler for ${targetName}.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePath(input.path, {
        requiredSuffix: ".ts",
        cwd: input.cwd,
        requiredPrefix: "./handlers/",
      }),
      ...parsePackageName(getPackageName(input.cwd), {
        requiredSuffix: "-grpc-server",
        silentError: true, // so checklists don't error
      }),
    };
  },

  templateFiles: {
    handler: path.join(sourceDir, "__target-name__.ts"),
    test: path.join(sourceDir, "__target-name__.test.ts"),
    index: path.join(sourceDir, "index.ts"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "handler",
      promptMessage: `Implement the ${context.targetName} gRPC handler. Make sure to:
        1. Use proper gRPC types from your proto package
        2. Handle expected errors from service/DB layers
        3. Let unexpected errors propagate to central error handler (no try/catch)
        4. Export the handler from the folder's "index.ts" file`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Update the main grpc.ts file to register the ${context.serviceName} service if it's not already there.
        1. Import the handler.
        2. Add the service to the server.
        3. Make sure to use the proper context wrapper.`,
    })),
  ],
});
