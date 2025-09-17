import {
  PromptStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
} from "@saflib/workflows";
import path from "node:path";
import { kebabCaseToCamelCase } from "../../../utils/index.ts";

const input = [
  {
    name: "path",
    description:
      "The path to the proto service file (e.g., 'protos/example.proto')",
    exampleValue: "protos/example.proto",
  },
] as const;

interface AddMethodWorkflowContext {
  serviceName: string;
  protoFile: string;
}

export const AddMethodWorkflowDefinition = defineWorkflow<
  typeof input,
  AddMethodWorkflowContext
>({
  id: "proto/add-method",

  description: "Add new gRPC methods to proto files",

  checklistDescription: ({ serviceName }) =>
    `Add new gRPC method to ${serviceName}.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const protoFile = path.join(input.cwd, input.path);
    const serviceName = kebabCaseToCamelCase(
      path.basename(input.path).split(".")[0],
    );

    return {
      protoFile,
      serviceName,
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

      If the proto file is empty, see how "health.proto" is structured and follow that format and include SafAuth and SafRequest.
\`\`\``,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "generate"],
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Upsert a ${context.serviceName}.ts client to the clients folder.
      
      If it does not exist, see how "health.ts" is structured and follow that format. Make sure to include a mocked client when testing.
      
      Whether or not it exists, include the mock implementation of the new method.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Update the index.ts file to export the new method.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Upsert a ${context.serviceName}.test.ts file to the clients folder.
      
      If it does not exist, see how "health.ts" is structured and follow that format.
      
      Whether or not it exists, test each mock implementation works, and demonstrate how the client can be called with type safety.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "test"],
    })),
  ],
});
