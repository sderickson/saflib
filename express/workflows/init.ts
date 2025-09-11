import {
  CopyStepMachine,
  UpdateStepMachine,
  DocStepMachine,
  defineWorkflow,
  step,
  CommandStepMachine,
  CwdStepMachine,
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

interface InitWorkflowContext {
  targetDir: string;
  packageName: string;
}

export const InitWorkflowDefinition = defineWorkflow<
  typeof input,
  InitWorkflowContext
>({
  id: "express/init",

  description:
    "Create a new HTTP service package following @saflib/express structure and conventions",

  checklistDescription: ({ packageName }) =>
    `Create a new ${packageName} HTTP service package.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    let packageName = input.name;
    // make sure packageName ends with -http
    if (!input.name.endsWith("-http")) {
      packageName = input.name + "-http";
    }
    const targetDir = path.join(input.cwd, input.path);

    return {
      targetDir,
      packageName,
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
    step(DocStepMachine, () => ({
      docId: "overview",
    })),

    step(CopyStepMachine, ({ context }) => ({
      name: context.packageName,
      targetDir: context.targetDir,
      lineReplace: (line) =>
        line.replace("@template/file-http", context.packageName),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "http",
      promptMessage: `Update **http.ts** to implement the HTTP server for ${context.packageName}.`,
    })),

    step(CwdStepMachine, ({ context }) => ({
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
