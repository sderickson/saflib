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
  updateTemplateComposer,
  type TemplateWorkflowContext,
} from "@saflib/workflows";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface AddTanstackQueriesWorkflowInput extends WorkflowInput {
  path: string; // e.g. "requests/feature.ts"
}

interface AddTanstackQueriesWorkflowContext extends TemplateWorkflowContext {
  camelName: string; // e.g. feature
  targetFile: string; // e.g. "/<abs-path>/requests/feature.ts"
  targetTestFile: string; // e.g. "/<abs-path>/requests/feature.test.ts"
  sourceFile: string; // e.g. "/<abs-path>/workflows/query-template.ts"
  sourceTestFile: string; // e.g. "/<abs-path>/workflows/query-template.test.ts"
  refDoc: string;
  testingGuide: string;
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

export const AddTanstackQueriesWorkflowMachine = setup({
  types: {
    input: {} as AddTanstackQueriesWorkflowInput,
    context: {} as AddTanstackQueriesWorkflowContext,
  },
  actions: workflowActions,
  actors: workflowActors,
}).createMachine({
  id: "add-tanstack-queries",
  description: "Add TanStack Query integration to a SAF-powered Vue SPA.",
  initial: "getOriented",
  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceFile = path.join(__dirname, "query-template.ts");
    const sourceTestFile = path.join(__dirname, "query-template.test.ts");
    const targetFile = path.join(process.cwd(), input.path);
    const targetTestFile = path.join(
      process.cwd(),
      input.path.replace(".ts", ".test.ts"),
    );
    const targetDir = path.dirname(targetFile);
    const name = path.basename(input.path, ".ts");
    const camelName = toCamelCase(name);
    const refDoc = path.resolve(__dirname, "../docs/03-adding-queries.md");
    const testingGuide = path.resolve(
      __dirname,
      "../../vue-spa-dev/docs/query-testing.md",
    );
    const packageIndexPath = path.join(targetDir, "index.ts");

    return {
      name,
      pascalName: name.charAt(0).toUpperCase() + name.slice(1),
      camelName,
      targetDir,
      sourceDir: __dirname,
      targetFile,
      targetTestFile,
      sourceFile,
      sourceTestFile,
      refDoc,
      testingGuide,
      packageIndexPath,
      ...contextFromInput(input),
    };
  },
  entry: logInfo("Successfully began workflow"),
  states: {
    ...promptAgentComposer<AddTanstackQueriesWorkflowContext>({
      promptForContext: ({ context }) =>
        `Read the project spec and the reference documentation for TanStack Query integration.

        See: ${context.refDoc}

        Also, review the testing guide: ${context.testingGuide}`,
      stateName: "getOriented",
      nextStateName: "copyTemplate",
    }),

    ...copyTemplateStateComposer({
      stateName: "copyTemplate",
      nextStateName: "reviewTestDocs",
    }),

    ...promptAgentComposer<AddTanstackQueriesWorkflowContext>({
      promptForContext: ({ context }) =>
        `Read the testing guide: ${context.testingGuide}`,
      stateName: "reviewTestDocs",
      nextStateName: "implementTests",
    }),

    ...updateTemplateComposer<AddTanstackQueriesWorkflowContext>({
      filePath: (context) => context.targetTestFile,
      promptMessage: (context) =>
        `Update the generated ${context.name}.test.ts file to follow the testing guide. Make sure to:

        1. Use withVueQuery for setup
        2. Set up mock server with appropriate handlers
        3. Test both success and error cases
        4. Test cache invalidation if mutations are present by overriding the GET endpoint to return updated data and verifying that the query data matches the updated response
        5. Follow the patterns from the example tests
        6. Always unmount the app after tests
        7. Use proper typing for mock data and responses`,
      stateName: "implementTests",
      nextStateName: "runTests",
    }),

    ...runTestsComposer<AddTanstackQueriesWorkflowContext>({
      filePath: (context) => context.targetTestFile,
      stateName: "runTests",
      nextStateName: "checkPackageIndex",
    }),

    ...promptAgentComposer<AddTanstackQueriesWorkflowContext>({
      promptForContext: ({ context }) =>
        `Update the package index.ts at ${context.packageIndexPath} to export the new queries file.

        For example, add:
        export * from './${context.name}.ts'

        See the docs for more: ${context.refDoc}`,
      stateName: "checkPackageIndex",
      nextStateName: "done",
    }),

    done: {
      type: "final",
    },
  },
  output: outputFromContext,
});

export class AddTanstackQueriesWorkflow extends XStateWorkflow {
  machine = AddTanstackQueriesWorkflowMachine;
  description = "Add TanStack Query integration to a SAF-powered Vue SPA.";
  cliArguments = [
    {
      name: "path",
      description: "Path of the new queries file (e.g. 'requests/feature.ts')",
      exampleValue: "requests/feature.ts",
    },
  ];
  sourceUrl = import.meta.url;
}
