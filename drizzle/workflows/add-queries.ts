import {
  CopyTemplateMachine,
  UpdateStepMachine,
  PromptStepMachine,
  TestStepMachine,
  makeWorkflowMachine,
  step,
  XStateWorkflow,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "query-template");

const input = [
  {
    name: "path",
    description: "Path of the new query (e.g. 'queries/contacts/get-by-id')",
    exampleValue: "queries/example-table/example-query",
  },
] as const;

interface AddQueriesWorkflowContext {
  name: string;
  camelName: string; // e.g. getById
  targetDir: string;
  refDoc: string;
  testingGuide: string;
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

export const AddQueriesWorkflowMachine = makeWorkflowMachine<
  AddQueriesWorkflowContext,
  typeof input
>({
  id: "add-queries",

  description:
    "Add a new query to a database built off the drizzle-sqlite3 package.",

  input,

  context: ({ input }) => {
    const targetDir = path.dirname(path.join(process.cwd(), input.path));
    const refDoc = path.resolve(import.meta.dirname, "../docs/03-queries.md");
    const testingGuide = path.resolve(
      import.meta.dirname,
      "../../drizzle-sqlite3-dev/docs/01-testing-guide.md",
    );
    const featureName = path.basename(targetDir);
    const featureIndexPath = path
      .join(targetDir, "index.ts")
      .replace(process.cwd(), "");
    const packageIndexPath = path.join(process.cwd(), "index.ts");
    const name = path.basename(input.path).split(".")[0];

    return {
      name,
      camelName: toCamelCase(name),
      targetDir,
      refDoc,
      testingGuide,
      featureName,
      featureIndexPath,
      packageIndexPath,
    };
  },

  templateFiles: {
    query: path.join(sourceDir, "query.ts"),
    test: path.join(sourceDir, "query.test.ts"),
  },

  docFiles: {},

  steps: [
    step(CopyTemplateMachine, ({ context }) => ({
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

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Review the guidelines for implementing database queries. 
      
      ${context.refDoc}`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "query",
      promptMessage: `Implement the \`${context.camelName}\` query following the documentation guidelines.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Review the guidelines for writing tests for database queries.
      
      ${context.testingGuide}`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Implement \`${context.name}.test.ts\`.
      
      Aim for 100% coverage; there should be a known way to achieve every handled error.`,
    })),

    step(TestStepMachine, () => ({
      fileId: "test",
    })),
  ],
});

export class AddQueriesWorkflow extends XStateWorkflow {
  machine = AddQueriesWorkflowMachine;
  description = AddQueriesWorkflowMachine.definition.description || "";
  cliArguments = [
    {
      name: "path",
      description: "Path of the new query (e.g. 'queries/contacts/get-by-id')",
      exampleValue: "queries/example-table/example-query",
    },
  ];
  sourceUrl = import.meta.url;
}
