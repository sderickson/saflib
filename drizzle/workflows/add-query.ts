import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  TestStepMachine,
  DocStepMachine,
  defineWorkflow,
  step,
  CommandStepMachine,
  type ParsePathOutput,
  parsePath,
  parsePackageName,
  getPackageName,
  type ParsePackageNameOutput,
  makeLineReplace,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(
  import.meta.dirname,
  "templates/queries/example-table",
);

const input = [
  {
    name: "path",
    description: "Path of the new query (e.g. 'queries/contacts/get-by-id')",
    exampleValue: "./queries/example/example-query.ts",
  },
] as const;

interface AddQueryWorkflowContext
  extends ParsePathOutput,
    ParsePackageNameOutput {}

export const AddQueryWorkflowDefinition = defineWorkflow<
  typeof input,
  AddQueryWorkflowContext
>({
  id: "drizzle/add-query",

  description:
    "Add a new query to a database built off the drizzle-sqlite3 package.",

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePackageName(getPackageName(input.cwd), {
        requiredSuffix: "-db",
      }),
      ...parsePath(input.path, {
        requiredPrefix: "./queries/",
        requiredSuffix: ".ts",
        cwd: input.cwd,
      }),
    };
  },

  templateFiles: {
    query: path.join(sourceDir, "__target-name__.ts"),
    test: path.join(sourceDir, "__target-name__.test.ts"),
    index: path.join(sourceDir, "index.ts"),
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

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Update \`${context.targetDir}/index.ts\` to include the new query.
        1. Import the new query from \`./${context.targetName}.ts\`
        2. Add it to the others being exported`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Update the package's root \`index.ts\` to export the query collection if it doesn't already.
      
      Do it like so:

      \`\`\`ts
      export * from "./queries/${context.groupName}/index.ts";
      \`\`\`
      `,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Add any new parameter or result types needed for the new query to the main \`types.ts\` file.

        As much as possible, these should be based on the types that drizzle provides. For example, if when creating a row, the database handles the id, createdAt, and updatedAt fields, have a "InsertTableRowParams" type that Omits those fields.

        Note: Do NOT create a new \`types.ts\` file. Add your types to the existing one next to the \`package.json\` file.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Add any error types the query will return to the main \`errors.ts\` file.
      Make sure to:
        1. Use simple extensions of the superclass for this package (which extends \`HandledDatabaseError\`)
        2. Do NOT create a new \`errors.ts\` file
        3. Add your errors to the existing one (beside the \`package.json\` file)`,
    })),

    step(DocStepMachine, () => ({
      docId: "refDoc",
    })),

    step(UpdateStepMachine, () => ({
      fileId: "query",
      promptMessage: `Implement the new query following the documentation guidelines.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(DocStepMachine, () => ({
      docId: "testingGuide",
    })),

    step(UpdateStepMachine, () => ({
      fileId: "test",
      promptMessage: `Implement the generated test file.
      
      Aim for 100% coverage; there should be a known way to achieve every handled error. If it's not possible to cause a returned error, it should not be in the implementation.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
      promptOnError: `You may have forgotten to provide all fields necessary. Do NOT decouple the types from the inferred types in types.ts. Instead fix the test.`,
    })),

    step(TestStepMachine, () => ({
      fileId: "test",
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),
  ],
});
