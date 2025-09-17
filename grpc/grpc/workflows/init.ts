import {
  CopyStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
  CwdStepMachine,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "name",
    description:
      "The name of the gRPC service package to create (e.g., 'secrets-grpc')",
    exampleValue: "@example-org/example-grpc",
  },
  {
    name: "path",
    description:
      "The relative path where the package should be created (e.g., 'grpc/example-grpc')",
    exampleValue: "grpc/example-grpc",
  },
] as const;

interface InitWorkflowContext {
  name: string;
  targetDir: string;
  packageName: string;
  serviceName: string;
}

export const InitWorkflowDefinition = defineWorkflow<
  typeof input,
  InitWorkflowContext
>({
  id: "grpc/init",

  description: "Create a new gRPC service package",

  checklistDescription: ({ name }) =>
    `Create a new ${name} gRPC service package.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    let name = input.name;
    // make sure name doesn't end with -grpc
    if (input.name.endsWith("-grpc")) {
      name = input.name.slice(0, -5);
    }
    const packageName = name + "-grpc";
    if (name.startsWith("@")) {
      name = name.split("/")[1];
    }
    const targetDir = path.join(input.cwd, input.path);
    const serviceName = name.charAt(0).toUpperCase() + name.slice(1);

    return {
      name,
      targetDir,
      packageName,
      serviceName,
    };
  },

  templateFiles: {
    package: path.join(sourceDir, "package.json"),
    grpc: path.join(sourceDir, "grpc.ts"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
    vitestConfig: path.join(sourceDir, "vitest.config.js"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
      lineReplace: (line) =>
        line.replace(
          "@template/file-",
          context.packageName.replace("-grpc", "-"),
        ),
    })),

    step(CwdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),
  ],
});
