import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
  parsePath,
  parsePackageName,
  getPackageName,
  makeLineReplace,
  type ParsePathOutput,
  type ParsePackageNameOutput,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(
  import.meta.dirname,
  "proto-templates/protos/__group_name__/",
);

const input = [
  {
    name: "path",
    description:
      "The path to the proto file to be created (e.g., 'secrets/list.proto')",
    exampleValue: "./secrets/list.proto",
  },
] as const;

interface AddProtoWorkflowContext
  extends ParsePathOutput,
    ParsePackageNameOutput {}

export const AddProtoWorkflowDefinition = defineWorkflow<
  typeof input,
  AddProtoWorkflowContext
>({
  id: "grpc/add-proto",

  description: "Add a new RPC to a proto file",

  checklistDescription: ({ targetName, targetDir }) =>
    `Add new RPC ${targetName} at ${targetDir}`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePackageName(getPackageName(input.cwd)),
      ...parsePath(input.path, {
        requiredSuffix: ".proto",
        cwd: input.cwd,
        requiredPrefix: "./protos/",
      }),
    };
  },

  templateFiles: {
    index: path.join(sourceDir, "index.proto"),
    templateFile: path.join(sourceDir, "__target_name__.proto"),
  },

  // TODO: add documentation file references
  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "templateFile",
      promptMessage: `Update **${context.targetName}.proto** to implement the RPC request and response messages. Define the appropriate fields for your RPC.`,
    })),

    step(UpdateStepMachine, () => ({
      fileId: "index",
      promptMessage: `Update **index.proto** to add the new RPC method to the service. The RPC should follow the pattern: rpc MethodName(RequestMessage) returns (ResponseMessage);`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "generate"],
      description: "Generate TypeScript types from the updated proto files.",
    })),

    step(PromptStepMachine, () => ({
      promptText: `Update the root index.ts file to import the generated grpc service and client, if it doesn't already.`,
    })),
  ],
});
