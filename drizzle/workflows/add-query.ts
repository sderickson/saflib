import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  TestStepMachine,
  DocStepMachine,
  defineWorkflow,
  step,
  CommandStepMachine,
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
    exampleValue: "queries/example-table/example-query",
  },
] as const;

interface AddQueryWorkflowContext {
  name: string;
  camelName: string; // e.g. getById
  targetDir: string;
  featureName: string; // e.g. "contacts"
  featureIndexPath: string; // e.g. "/<abs-path>/queries/contacts/index.ts"
  packageIndexPath: string; // e.g. "/<abs-path>/index.ts"
}

function toCamelCase(name: string) {
  return name
    .split("-")
    .map((part, index) => {
      if (index === 0) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

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
    const targetDir = path.dirname(path.join(input.cwd, input.path));
    const featureName = path.basename(targetDir);
    const featureIndexPath = path
      .join(targetDir, "index.ts")
      .replace(input.cwd, "");
    const packageIndexPath = path.join(input.cwd, "index.ts");
    const name = path.basename(input.path).split(".")[0];

    return {
      name,
      camelName: toCamelCase(name),
      targetDir,
      featureName,
      featureIndexPath,
      packageIndexPath,
    };
  },

  templateFiles: {
    query: path.join(sourceDir, "template-file.ts"),
    test: path.join(sourceDir, "template-file.test.ts"),
    index: path.join(sourceDir, "index.ts"),
  },

  docFiles: {
    refDoc: path.join(import.meta.dirname, "../docs/03-queries.md"),
    testingGuide: path.join(import.meta.dirname, "../docs/04-testing.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Check if \`${context.featureIndexPath}\` exists. If it doesn't exist, create it.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Update \`${context.featureIndexPath}\` to include the new query.
        1. Import the new query from \`./${context.name}.ts\`
        2. Add the query to the collection object using the camelCase name
        3. Make sure to export a \`${context.featureName}\` object that contains all queries for this domain`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Update the package's \`index.ts\` to export the query collection if it doesn't already.
      
      Do it like so:

      \`\`\`ts
      export * from "./queries/${context.featureName}/index.ts";
      \`\`\`
      `,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Add any new parameter or result types needed for \`${context.camelName}\` to the main \`types.ts\` file.

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

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "query",
      promptMessage: `Implement the \`${context.camelName}\` query following the documentation guidelines.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(DocStepMachine, () => ({
      docId: "testingGuide",
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Implement \`${context.name}.test.ts\`.
      
      Aim for 100% coverage; there should be a known way to achieve every handled error.`,
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
