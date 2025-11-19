import {
  CopyStepMachine,
  defineWorkflow,
  step,
  CdStepMachine,
  CommandStepMachine,
  type ParsePackageNameOutput,
  parsePackageName,
  makeLineReplace,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "common-templates");

const input = [
  {
    name: "name",
    description:
      "The name of the shared service package to create (e.g., 'example-service-common')",
    exampleValue: "example-service-common",
  },
  {
    name: "path",
    description:
      "The path to the target directory which houses all service packages.",
    exampleValue: "services/example-service-common",
  },
] as const;

interface InitCommonWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
}

export const InitCommonWorkflowDefinition = defineWorkflow<
  typeof input,
  InitCommonWorkflowContext
>({
  id: "service/init-common",

  description: "Create a shared service package",

  checklistDescription: ({ packageName }) =>
    `Create the ${packageName} shared service package.`,

  input,

  sourceUrl: import.meta.url,

  versionControl: {
    allowPaths: ["./env.ts"],
  },

  context: ({ input }) => {
    return {
      ...parsePackageName(input.name, {
        requiredSuffix: "-service-common",
      }),
      targetDir: path.join(input.cwd, input.path),
    };
  },

  templateFiles: {
    context: path.join(sourceDir, "context.ts"),
    envSchema: path.join(sourceDir, "env.schema.json"),
    index: path.join(sourceDir, "index.ts"),
    packageJson: path.join(sourceDir, "package.json"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
    vitestConfig: path.join(sourceDir, "vitest.config.js"),
    test: path.join(sourceDir, "index.test.ts"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.serviceName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(CdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-env", "generate"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["test"],
    })),
  ],
});
