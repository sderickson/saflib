import {
  CopyStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
  parsePackageName,
  makeLineReplace,
  type ParsePackageNameOutput,
  CdStepMachine,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "client-templates");

const input = [
  {
    name: "name",
    description:
      "The name of the gRPC client package to create (e.g., 'identity-grpc-client' or 'secrets-grpc-client')",
    exampleValue: "example-grpc-client",
  },
  {
    name: "path",
    description:
      "The path to the target directory for the gRPC client package (e.g., './identity/identity-grpc-client')",
    exampleValue: "./identity/identity-grpc-client",
  },
] as const;

interface InitClientWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
}

export const InitGrpcClientWorkflowDefinition = defineWorkflow<
  typeof input,
  InitClientWorkflowContext
>({
  id: "grpc/init-client",

  description: "Initialize a new gRPC client package",

  checklistDescription: ({ packageName, targetDir }) =>
    `Create the ${packageName} gRPC client package at ${targetDir}`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePackageName(input.name, {
        requiredSuffix: "-grpc-client",
      }),
      targetDir: path.join(input.cwd, input.path),
    };
  },

  templateFiles: {
    packageJson: path.join(sourceDir, "package.json"),
    index: path.join(sourceDir, "index.ts"),
    env: path.join(sourceDir, "env.ts"),
    healthIndex: path.join(sourceDir, "rpcs/health/index.ts"),
    healthFake: path.join(sourceDir, "rpcs/health/get-health.fake.ts"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
  },

  // TODO: add documentation file references
  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: "",
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(CdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-env", "generate"],
      description: "Generate environment configuration files.",
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
      description:
        "Run TypeScript type checking to ensure all types are correct.",
    })),
  ],
});
