import {
  CopyStepMachine,
  defineWorkflow,
  step,
  CommandStepMachine,
  CdStepMachine,
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
      "The name of the HTTP service package to create (e.g., 'user-http' or 'analytics-http')",
    exampleValue: "example-http",
  },
  {
    name: "path",
    description:
      "The path to the target directory for the HTTP service package (e.g., './services/example')",
    exampleValue: "./services/example",
  },
] as const;

interface ExpressInitWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
}

export const ExpressInitWorkflowDefinition = defineWorkflow<
  typeof input,
  ExpressInitWorkflowContext
>({
  id: "express/init",

  description: "Create an Express HTTP service package",

  checklistDescription: ({ packageName }) =>
    `Create the ${packageName} Express HTTP service package.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePackageName(input.name, {
        requiredSuffix: "-http",
      }),
      targetDir: path.join(input.cwd, input.path),
    };
  },

  templateFiles: {
    http: path.join(sourceDir, "http.ts"),
    index: path.join(sourceDir, "index.ts"),
    packageJson: path.join(sourceDir, "package.json"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
    vitestConfig: path.join(sourceDir, "vitest.config.js"),
    test: path.join(sourceDir, "index.test.ts"),
  },

  docFiles: {
    overview: path.join(import.meta.dirname, "../docs/01-overview.md"),
  },

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
      args: ["install"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["test"],
    })),
  ],
});
