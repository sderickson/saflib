import { CopyStepMachine, defineWorkflow, step, CwdStepMachine, CommandStepMachine } from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "name",
    description:
      "The name of the database package to create (e.g., 'user-db' or 'analytics-db')",
    exampleValue: "example-db",
  },
  {
    name: "path",
    description:
      "The path to the target directory for the database package (e.g., './services/example-db')",
    exampleValue: "./services/example-service/example-db",
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
  id: "drizzle/init",

  description:
    "Create a new database package following the @saflib/drizzle structure and conventions",

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    let name = input.name;
    // make sure name doesn't end with -db
    if (input.name.endsWith("-db")) {
      name = input.name.slice(0, -3);
    }
    const packageName = name + "-db";
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
    packageJson: path.join(sourceDir, "package.json"),
    drizzleConfig: path.join(sourceDir, "drizzle.config.ts"),
    schema: path.join(sourceDir, "schema.ts"),
    instances: path.join(sourceDir, "instances.ts"),
    errors: path.join(sourceDir, "errors.ts"),
    types: path.join(sourceDir, "types.ts"),
    index: path.join(sourceDir, "index.ts"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
    vitestConfig: path.join(sourceDir, "vitest.config.js"),
    gitignore: path.join(sourceDir, ".gitignore"),
    test: path.join(sourceDir, "index.test.ts"),
  },

  docFiles: {
    overview: path.join(import.meta.dirname, "../docs/01-overview.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
      lineReplace: (line) =>
        line.replace("@template/file-db", context.packageName),
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
