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

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "name",
    description:
      "The name of the identity service package to create (e.g., 'example-identity')",
    exampleValue: "example-identity",
  },
  {
    name: "path",
    description:
      "The path to the target directory for the identity service package (e.g., './services/example-identity')",
    exampleValue: "./services/example-identity",
  },
] as const;

interface IdentityInitWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
}

export const IdentityInitWorkflowDefinition = defineWorkflow<
  typeof input,
  IdentityInitWorkflowContext
>({
  id: "identity/init",

  description: "Create an identity service package",

  checklistDescription: ({ packageName }) =>
    `Create the ${packageName} identity service package.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePackageName(input.name, {
        requiredSuffix: "-identity",
      }),
      targetDir: path.join(input.cwd, input.path),
    };
  },

  templateFiles: {
    packageJson: path.join(sourceDir, "package.json"),
    callbacks: path.join(sourceDir, "callbacks.ts"),
    runScript: path.join(sourceDir, "run.ts"),
    envSchema: path.join(sourceDir, "env.schema.combined.json"),
    dockerfile: path.join(sourceDir, "Dockerfile.template"),
    index: path.join(sourceDir, "index.ts"),
    test: path.join(sourceDir, "index.test.ts"),
    vitestConfig: path.join(sourceDir, "vitest.config.js"),
    dataDir: path.join(sourceDir, "data"),
    binDir: path.join(sourceDir, "bin"),
    gitignore: path.join(sourceDir, ".gitignore"),
  },

  docFiles: {},

  versionControl: {
    allowPaths: ["./env.ts"],
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.packageName,
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
  ],
});

export default IdentityInitWorkflowDefinition;
