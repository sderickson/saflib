import { setup } from "xstate";
import {
  workflowActions,
  workflowActors,
  logInfo,
  promptAgentComposer,
  runTestsComposer,
  XStateWorkflow,
  contextFromInput,
  type WorkflowInput,
  outputFromContext,
  copyTemplateStateComposer,
  updateTemplateFileComposer,
  type TemplateWorkflowContext,
} from "@saflib/workflows";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface AddQueriesWorkflowInput extends WorkflowInput {
  path: string; // kebab-case, e.g. "get-by-id"
}

interface AddQueriesWorkflowContext extends TemplateWorkflowContext {
  camelName: string; // e.g. getById
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

function toPascalCase(name: string) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export const AddQueriesWorkflowMachine = setup({
  types: {
    input: {} as AddQueriesWorkflowInput,
    context: {} as AddQueriesWorkflowContext,
  },
  actions: workflowActions,
  actors: workflowActors,
}).createMachine({
  id: "add-queries",
  description:
    "Add a new query to a database built off the drizzle-sqlite3 package.",
  initial: "getOriented",
  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceDir = path.join(__dirname, "query-template");
    const targetDir = path.dirname(path.join(process.cwd(), input.path));
    const refDoc = path.resolve(__dirname, "../docs/03-queries.md");
    const testingGuide = path.resolve(
      __dirname,
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
      pascalName: toPascalCase(name),
      camelName: toCamelCase(name),
      targetDir,
      sourceDir,
      refDoc,
      testingGuide,
      featureName,
      featureIndexPath,
      packageIndexPath,
      ...contextFromInput(input),
    };
  },
  entry: logInfo("Successfully began workflow"),
  states: {
    ...promptAgentComposer<AddQueriesWorkflowContext>({
      promptForContext: ({ context }) =>
        `Read the project spec and understand the overall goal for ${context.name}.`,
      stateName: "getOriented",
      nextStateName: "copyTemplate",
    }),

    ...copyTemplateStateComposer({
      stateName: "copyTemplate",
      nextStateName: "checkQueryCollection",
    }),

    ...promptAgentComposer<AddQueriesWorkflowContext>({
      promptForContext: ({ context }) =>
        `Check if \`${context.featureIndexPath}\` exists. If it doesn't exist, create it.`,
      stateName: "checkQueryCollection",
      nextStateName: "updateQueryCollection",
    }),

    ...promptAgentComposer<AddQueriesWorkflowContext>({
      promptForContext: ({ context }) =>
        `Update \`${context.featureIndexPath}\` to include the new query.
        1. Import the new query from \`./${context.name}.ts\`
        2. Add the query to the collection object using the camelCase name
        3. Make sure to export a \`${context.featureName}\` object that contains all queries for this domain`,
      stateName: "updateQueryCollection",
      nextStateName: "updatePackageIndex",
    }),

    ...promptAgentComposer<AddQueriesWorkflowContext>({
      promptForContext: ({ context }) =>
        `Update the package's \`index.ts\` to export the query collection if it doesn't already.
      
      Do it like so:

      \`\`\`ts
      export * from "./queries/${context.featureName}/index.ts";
      \`\`\`
      `,
      stateName: "updatePackageIndex",
      nextStateName: "addTypes",
    }),

    ...promptAgentComposer<AddQueriesWorkflowContext>({
      promptForContext: ({ context }) =>
        `Add any new parameter or result types needed for \`${context.camelName}\` to the main \`types.ts\` file.

        As much as possible, these should be based on the types that drizzle provides. For example, if when creating a row, the database handles the id, createdAt, and updatedAt fields, have a "InsertTableRowParams" type that Omits those fields.

        Note: Do NOT create a new \`types.ts\` file. Add your types to the existing one next to the \`package.json\` file.`,
      stateName: "addTypes",
      nextStateName: "addErrors",
    }),

    ...promptAgentComposer<AddQueriesWorkflowContext>({
      promptForContext: () =>
        `Add any error types the query will return to the main \`errors.ts\` file.
      Make sure to:
        1. Use simple extensions of the superclass for this package (which extends \`HandledDatabaseError\`)
        2. Do NOT create a new \`errors.ts\` file
        3. Add your errors to the existing one (beside the \`package.json\` file)`,
      stateName: "addErrors",
      nextStateName: "reviewDocsForImplementation",
    }),

    ...promptAgentComposer<AddQueriesWorkflowContext>({
      promptForContext: ({ context }) =>
        `Review the guidelines for implementing database queries. 
      
      ${context.refDoc}`,
      stateName: "reviewDocsForImplementation",
      nextStateName: "implementQuery",
    }),

    ...updateTemplateFileComposer<AddQueriesWorkflowContext>({
      filePath: (context) => path.join(context.targetDir, `${context.name}.ts`),
      promptMessage: (context) =>
        `Implement the \`${context.camelName}\` query following the documentation guidelines.`,
      stateName: "implementQuery",
      nextStateName: "reviewTestingDocs",
    }),

    ...promptAgentComposer<AddQueriesWorkflowContext>({
      promptForContext: ({ context }) =>
        `Review the guidelines for writing tests for database queries.
      
      ${context.testingGuide}`,
      stateName: "reviewTestingDocs",
      nextStateName: "updateTests",
    }),

    ...updateTemplateFileComposer<AddQueriesWorkflowContext>({
      filePath: (context) =>
        path.join(context.targetDir, `${context.name}.test.ts`),
      promptMessage: (context) => `Implement \`${context.name}.test.ts\`.
      
      Aim for 100% coverage; there should be a known way to achieve every handled error.`,
      stateName: "updateTests",
      nextStateName: "runTests",
    }),

    ...runTestsComposer<AddQueriesWorkflowContext>({
      filePath: (context) =>
        path.join(context.targetDir, `${context.name}.test.ts`),
      stateName: "runTests",
      nextStateName: "done",
    }),

    done: {
      type: "final",
    },
  },
  output: outputFromContext,
});

export class AddQueriesWorkflow extends XStateWorkflow {
  machine = AddQueriesWorkflowMachine;
  description =
    "Add a new query to a database built off the drizzle-sqlite3 package.";
  cliArguments = [
    {
      name: "path",
      description: "Path of the new query (e.g. 'queries/contacts/get-by-id')",
      exampleValue: "queries/example-table/example-query",
    },
  ];
  sourceUrl = import.meta.url;
}
