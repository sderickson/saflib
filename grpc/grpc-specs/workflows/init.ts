import {
  CopyStepMachine,
  UpdateStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "name",
    description:
      "The name of the protocol buffer package to create (e.g., 'secrets-proto')",
    exampleValue: "secrets-proto",
  },
  {
    name: "path",
    description:
      "The relative path where the package should be created (e.g., 'grpc/secrets-proto')",
    exampleValue: "grpc/secrets-proto",
  },
] as const;

interface InitWorkflowContext {
  name: string;
  path: string;
  targetDir: string;
  packageName: string;
}

export const InitWorkflowDefinition = defineWorkflow<
  typeof input,
  InitWorkflowContext
>({
  id: "protos/init",

  description: "Create a new protocol buffer package",

  checklistDescription: ({ name, path }) =>
    `Create a new ${name} protocol buffer package at ${path}.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const targetDir = path.join(input.cwd, input.path);
    const packageName = `@saflib/${input.name}`;

    return {
      name: input.name,
      path: input.path,
      targetDir,
      packageName,
    };
  },

  templateFiles: {
    package: path.join(sourceDir, "package.json"),
    proto: path.join(sourceDir, "init.proto"),
    index: path.join(sourceDir, "index.ts"),
  },

  // TODO: add documentation file references
  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "package",
      promptMessage: `Update **${path.basename(context.copiedFiles!.package)}** with the correct package name and dependencies.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "proto",
      promptMessage: `Update **${path.basename(context.copiedFiles!.proto)}** with the service definition.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "index",
      promptMessage: `Update **${path.basename(context.copiedFiles!.index)}** to export the generated types.`,
    })),

    step(CommandStepMachine, ({ context }) => ({
      command: "npm",
      args: ["run", "generate"],
      cwd: context.targetDir,
    })),
  ],
});
