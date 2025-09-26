import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
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
  "client-templates/rpcs/__group-name__",
);

const input = [
  {
    name: "path",
    description:
      "The path to the RPC client file to be created (e.g., 'rpcs/users/get-user-profile.ts')",
    exampleValue: "./rpcs/users/get-user-profile.ts",
  },
] as const;

interface AddRpcWorkflowContext
  extends ParsePathOutput,
    ParsePackageNameOutput {}

export const AddRpcWorkflowDefinition = defineWorkflow<
  typeof input,
  AddRpcWorkflowContext
>({
  id: "grpc/add-rpc",

  description: "Add a new RPC client to a gRPC client package",

  checklistDescription: ({ targetName, targetDir }) =>
    `Add new RPC client ${targetName} at ${targetDir}`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePackageName(getPackageName(input.cwd)),
      ...parsePath(input.path, {
        requiredSuffix: ".ts",
        cwd: input.cwd,
        requiredPrefix: "./rpcs/",
      }),
    };
  },

  templateFiles: {
    rpcFake: path.join(sourceDir, "__target-name__.fake.ts"),
    index: path.join(sourceDir, "index.ts"),
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
      fileId: "rpcFake",
      promptMessage: `Update **${context.targetName}.fake.ts** to implement the fake RPC handler for testing. Make sure to:
        1. Return appropriate mock data based on the request
        2. Handle different request scenarios if needed
        3. Use proper TypeScript types`,
    })),

    step(UpdateStepMachine, () => ({
      fileId: "index",
      promptMessage: `Update **index.ts** to export the new RPC client and types.
      
      Also export any classes from the proto package which are necessary to create a request, such as Timestamp.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Update the root index.ts file to export the new RPC client and types from the ${context.groupName} group.`,
    })),
  ],
});
