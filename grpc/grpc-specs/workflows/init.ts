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
      "The name of the protocol buffer package to create (e.g., 'secrets-proto')",
    exampleValue: "@example-org/example-proto",
  },
  {
    name: "path",
    description:
      "The relative path where the package should be created (e.g., 'grpc/example-proto')",
    exampleValue: "grpc/example-proto",
  },
] as const;

interface InitWorkflowContext {
  name: string;
  targetDir: string;
  packageName: string;
}

export const InitWorkflowDefinition = defineWorkflow<
  typeof input,
  InitWorkflowContext
>({
  id: "proto/init",

  description: "Create a new protocol buffer package",

  checklistDescription: ({ name }) =>
    `Create a new ${name} protocol buffer package.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    let name = input.name;
    // make sure name doesn't end with -protos
    if (input.name.endsWith("-proto")) {
      name = input.name.slice(0, -6);
    }
    const packageName = name + "-proto";
    if (name.startsWith("@")) {
      name = name.split("/")[1];
    }
    const targetDir = path.join(input.cwd, input.path);

    return {
      name,
      targetDir,
      packageName,
    };
  },

  templateFiles: {
    package: path.join(sourceDir, "package.json"),
    index: path.join(sourceDir, "index.ts"),
    protos: path.join(sourceDir, "protos"),
    clients: path.join(sourceDir, "clients"),
    dist: path.join(sourceDir, "dist"),
    envSchema: path.join(sourceDir, "env.schema.json"),
    env: path.join(sourceDir, "env.ts"),
    generate: path.join(sourceDir, "generate.sh"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
    typedoc: path.join(sourceDir, "typedoc.json"),
  },

  // TODO: add documentation file references
  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
      lineReplace: (line) =>
        line.replace(
          "@template/file-",
          context.packageName.replace("-proto", "-"),
        ),
    })),

    step(CwdStepMachine, ({ context }) => ({
      path: context.targetDir,
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
