import {
  PromptStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
} from "@saflib/workflows";
import path from "node:path";

const input = [
  {
    name: "path",
    description:
      "The path to the proto service file (e.g., 'protos/example.proto')",
    exampleValue: "protos/example.proto",
  },
] as const;

interface AddMethodWorkflowContext {
  path: string;
  protoFile: string;
  packageDir: string;
}

export const AddMethodWorkflowDefinition = defineWorkflow<
  typeof input,
  AddMethodWorkflowContext
>({
  id: "proto/add-method",

  description: "Add new gRPC methods to proto files",

  checklistDescription: ({ path }) => `Add new gRPC method to ${path}.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const protoFile = path.join(input.cwd, input.path);
    const packageDir = path.dirname(path.dirname(protoFile)); // Go up two levels from protos/file.proto

    return {
      path: input.path,
      protoFile,
      packageDir,
    };
  },

  templateFiles: {},

  docFiles: {},

  steps: [
    step(CommandStepMachine, ({ context }) => ({
      command: "touch",
      args: [context.protoFile],
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Add the new gRPC method to **${context.protoFile}**.

      If the proto file is empty, see how "health.proto" is structured and follow that format.

Please add the method definition to the service in the proto file. Include:
1. The RPC method definition in the service
2. The request message definition
3. The response message definition

Example format:
\`\`\`proto
service YourService {
  rpc YourMethod(YourMethodRequest) returns (YourMethodResponse);
}

message YourMethodRequest {
  // Add request fields here
}

message YourMethodResponse {
  // Add response fields here
}
\`\`\``,
    })),

    step(CommandStepMachine, ({ context }) => ({
      command: "npm",
      args: ["run", "generate"],
      cwd: context.packageDir,
    })),
  ],
});
