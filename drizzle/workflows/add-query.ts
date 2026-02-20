import {
  CopyStepMachine,
  UpdateStepMachine,
  defineWorkflow,
  step,
  CommandStepMachine,
  type ParsePathOutput,
  parsePath,
  parsePackageName,
  // checkPackageDependency,
  getPackageName,
  type ParsePackageNameOutput,
  makeLineReplace,
} from "@saflib/workflows";
import { existsSync } from "node:fs";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "path",
    description: "Path of the new query (e.g. 'queries/contacts/get-by-id')",
    exampleValue: "./queries/example/example-query.ts",
  },
] as const;

interface AddDrizzleQueryWorkflowContext
  extends ParsePathOutput,
    ParsePackageNameOutput {}

export const AddDrizzleQueryWorkflowDefinition = defineWorkflow<
  typeof input,
  AddDrizzleQueryWorkflowContext
>({
  id: "drizzle/add-query",

  description:
    "Add a new query to a database built off the drizzle-sqlite3 package.",

  checklistDescription: ({ groupName, targetName }) =>
    `Add new query ${groupName}/${targetName} to the database.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    // maybe later?
    // checkPackageDependency(input.cwd, "@saflib/drizzle");
    let packageName = "@mock/package-db";
    if (existsSync(path.join(input.cwd, "package.json"))) {
      packageName = getPackageName(input.cwd);
    }
    return {
      ...parsePackageName(packageName, {
        requiredSuffix: "-db",
        silentError: true, // so checklists don't error
      }),
      ...parsePath(input.path, {
        requiredPrefix: "./queries/",
        requiredSuffix: ".ts",
        cwd: input.cwd,
      }),
      targetDir: input.cwd,
    };
  },

  templateFiles: {
    query: path.join(sourceDir, "queries/__group-name__/__target-name__.ts"),
    test: path.join(
      sourceDir,
      "queries/__group-name__/__target-name__.test.ts",
    ),
    groupIndex: path.join(sourceDir, "queries/__group-name__/index.ts"),
    rootIndex: path.join(sourceDir, "index.ts"),
    types: path.join(sourceDir, "types.ts"),
    errors: path.join(sourceDir, "errors.ts"),
  },

  docFiles: {
    refDoc: path.join(import.meta.dirname, "../docs/03-queries.md"),
    testingGuide: path.join(import.meta.dirname, "../docs/04-testing.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "query",
      promptMessage: `Implement the new query following the documentation guidelines.
      Full path: ${context.copiedFiles?.query}

        * As much as possible, types should be based on the types that drizzle provides.
        * A resource not being found by ID is an error.
        * Errors should be simple, no special constructors or anything.
        * You don't need to export error types from the types.ts file.
        
        Please reference the documentation here for more information: ${context.docFiles?.refDoc}`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Implement the generated test file.

      Full path: ${context.copiedFiles?.test}

      Aim for 100% coverage; there should be a known way to achieve every handled error. If it's not possible to cause a returned error, it should not be in the implementation.
      
      Please reference the documentation here for more information: ${context.docFiles?.testingGuide}`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
      promptOnError: `You may have forgotten to provide all fields necessary. Do NOT decouple the types from the inferred types in types.ts. Instead fix the test.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "test"],
    })),
  ],
});
