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

const sourceDir = path.join(import.meta.dirname, "proto-templates");

const input = [
  {
    name: "name",
    description:
      "The name of the protocol buffer package to create (e.g., 'secrets-grpc-proto')",
    exampleValue: "@example-org/example-grpc-proto",
  },
  {
    name: "path",
    description:
      "The relative path where the package should be created (e.g., 'grpc/example-grpc-proto')",
    exampleValue: "grpc/example-grpc-proto",
  },
] as const;

interface InitGrpcProtoWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
}

export const InitGrpcProtoWorkflowDefinition = defineWorkflow<
  typeof input,
  InitGrpcProtoWorkflowContext
>({
  id: "grpc/init-proto",

  description: "Create a new protocol buffer package",

  checklistDescription: ({ serviceName }) =>
    `Create a new ${serviceName} protocol buffer package.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePackageName(input.name, {
        requiredSuffix: "-grpc-proto",
      }),
      targetDir: path.join(input.cwd, input.path),
    };
  },

  templateFiles: {
    envelopeProto: path.join(sourceDir, "protos/envelope.proto"),
    healthIndexProto: path.join(sourceDir, "protos/health/index.proto"),
    getHealthProto: path.join(sourceDir, "protos/health/get-health.proto"),
    envSchema: path.join(sourceDir, "env.schema.json"),
    generate: path.join(sourceDir, "generate.sh"),
    index: path.join(sourceDir, "index.ts"),
    package: path.join(sourceDir, "package.json"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
    typedoc: path.join(sourceDir, "typedoc.json"),
    vitestConfig: path.join(sourceDir, "vitest.config.js"),
  },

  // TODO: add documentation file references
  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.serviceName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(CwdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),

    step(CommandStepMachine, () => ({
      command: "mkdir",
      args: ["-p", "protos"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "generate"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-env", "generate"],
    })),
  ],
});
