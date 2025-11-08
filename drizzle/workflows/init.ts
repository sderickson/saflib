import {
  CopyStepMachine,
  defineWorkflow,
  step,
  CwdStepMachine,
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
      "The name of the database package to create (e.g., 'user-db' or 'analytics-db')",
    exampleValue: "@example-org/example-db",
  },
  {
    name: "path",
    description:
      "The path to the target directory for the database package (e.g., './services/example-db')",
    exampleValue: "./services/example-service/example-db",
  },
] as const;

interface DrizzleInitWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
}

export const DrizzleInitWorkflowDefinition = defineWorkflow<
  typeof input,
  DrizzleInitWorkflowContext
>({
  id: "drizzle/init",

  description: "Create a Drizzle/SQLite database package",

  checklistDescription: ({ packageName }) =>
    `Create the ${packageName} Drizzle/SQLite database package.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePackageName(input.name, { requiredSuffix: "-db" }),
      targetDir: path.join(input.cwd, input.path),
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

  versionControl: {
    allowPaths: ["./migrations/**", "./data/.gitkeep"],
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: "", // needed?
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(CwdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    // initialize drizzle sqlite migrations
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "generate"],
    })),

    // make a data dir
    step(CommandStepMachine, () => ({
      command: "mkdir",
      args: ["-p", "data"],
    })),
    step(CommandStepMachine, () => ({
      command: "touch",
      args: ["data/.gitkeep"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["test"],
    })),
  ],
});
