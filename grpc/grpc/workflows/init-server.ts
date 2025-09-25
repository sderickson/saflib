import {
  CopyStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
  CwdStepMachine,
  type ParsePackageNameOutput,
  parsePackageName,
  makeLineReplace,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "server-templates");

const input = [
  {
    name: "name",
    description:
      "The name of the gRPC service package to create (e.g., 'secrets-grpc-server')",
    exampleValue: "@example-org/example-grpc-server",
  },
  {
    name: "path",
    description:
      "The relative path where the package should be created (e.g., 'grpc/example-grpc-server')",
    exampleValue: "grpc/example-grpc-server",
  },
] as const;

interface InitWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
}

export const InitWorkflowDefinition = defineWorkflow<
  typeof input,
  InitWorkflowContext
>({
  id: "grpc/init-server",

  description: "Create a new gRPC service package",

  checklistDescription: ({ serviceName }) =>
    `Create a new ${serviceName} gRPC server package.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePackageName(input.name, {
        requiredSuffix: "-grpc-server",
      }),
      targetDir: path.join(input.cwd, input.path),
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
      name: "",
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
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
