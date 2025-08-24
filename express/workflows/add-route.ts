// @ts-nocheck // TODO: refactor to factories, their types work
import { setup } from "xstate";
import {
  workflowActions,
  workflowActors,
  logInfo,
  type WorkflowContext,
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
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { kebabCaseToPascalCase, kebabCaseToCamelCase } from "@saflib/utils";
import { getTopWorkflowDir } from "@saflib/dev-tools";

interface AddRouteWorkflowInput extends WorkflowInput {
  path: string; // kebab-case, e.g. "routes/call-series/create-call-series.ts"
}

interface AddRouteWorkflowContext extends TemplateWorkflowContext {
  camelName: string; // e.g. createCallSeries
  refDoc: string;
  testingGuide: string;
  featureName: string; // e.g. "call-series"
  featureRouterPath: string; // e.g. "/routes/call-series/index.ts"
  pascalFeatureName: string; // e.g. "CallSeries"
  httpAppPath: string; // e.g. "/http.ts"
  appPath: string; // e.g. "/app.ts"
}

export const AddRouteWorkflowMachine = setup({
  types: {
    input: {} as AddRouteWorkflowInput,
    context: {} as AddRouteWorkflowContext,
  },
  actions: workflowActions,
  actors: workflowActors,
}).createMachine({
  id: "add-route",
  description: "Add a new route to an Express.js service.",
  initial: "getOriented",
  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceDir = path.join(__dirname, "route-template");
    const targetDir = path.dirname(path.join(process.cwd(), input.path));
    const refDoc = path
      .resolve(__dirname, "../docs/02-adding-routes.md")
      .replace(getTopWorkflowDir(), "");
    const testingGuide = path
      .resolve(__dirname, "../docs/03-test-routes.md")
      .replace(getTopWorkflowDir(), "");
    const featureName = path.basename(targetDir);

    const cwd = process.cwd();
    const featureRouterPath = path.join(targetDir, "index.ts").replace(cwd, "");
    const pascalFeatureName = kebabCaseToPascalCase(featureName);
    const httpAppPath = path.join(cwd, "http.ts").replace(cwd, "");
    const appPath = path.join(cwd, "app.ts").replace(cwd, "");
    const name = path.basename(input.path).split(".")[0];

    return {
      name,
      pascalName: kebabCaseToPascalCase(name),
      camelName: kebabCaseToCamelCase(name),
      targetDir,
      sourceDir,
      refDoc,
      testingGuide,
      featureName,
      featureRouterPath,
      pascalFeatureName,
      httpAppPath,
      appPath,
      ...contextFromInput(input),
    };
  },
  entry: logInfo("Successfully began workflow"),
  states: {
    ...promptAgentComposer<AddRouteWorkflowContext>({
      promptForContext: ({ context }) =>
        `Read the reference documentation for adding routes.
      
      \`${context.refDoc}\`

        This workflow will help you add a new route handler for ${context.name}. The route will be created in ${context.targetDir}.`,
      stateName: "getOriented",
      nextStateName: "copyTemplate",
    }),

    ...copyTemplateStateComposer({
      stateName: "copyTemplate",
      nextStateName: "checkFeatureRouter",
    }),

    ...promptAgentComposer<AddRouteWorkflowContext>({
      promptForContext: ({ context }) =>
        `Check if the feature router exists at \`${context.featureRouterPath}\`. If it doesn't exist, create it with the basic structure to export the new route handler.`,
      stateName: "checkFeatureRouter",
      nextStateName: "updateFeatureRouter",
    }),

    ...promptAgentComposer<AddRouteWorkflowContext>({
      promptForContext: ({ context }) =>
        `Update the feature router at \`${context.featureRouterPath}\` to include the new route handler.
        1. Import the new handler from "./${context.name}.ts"
        2. Add the route to the router using the appropriate HTTP method
        3. Make sure to export a create${context.pascalFeatureName}Router function that returns the router`,
      stateName: "updateFeatureRouter",
      nextStateName: "checkHttpApp",
    }),

    ...promptAgentComposer<AddRouteWorkflowContext>({
      promptForContext: ({ context }) =>
        `Check if the HTTP app exists at \`${context.httpAppPath}\` or \`${context.appPath}\`. If neither exists, create one to mount your routes.`,
      stateName: "checkHttpApp",
      nextStateName: "updateHttpApp",
    }),

    ...promptAgentComposer<AddRouteWorkflowContext>({
      promptForContext: ({ context }) =>
        `Update the HTTP app to include the feature router.
        1. Import the feature router: \`import { create${context.pascalFeatureName}Router } from "./routes/${context.featureName}/index.ts"\`
        2. Add the router to the app: \`app.use("/${context.featureName}", create${context.pascalFeatureName}Router())\`
        3. Make sure to add this before the error handlers`,
      stateName: "updateHttpApp",
      nextStateName: "implementRoute",
    }),

    ...updateTemplateFileComposer<AddRouteWorkflowContext>({
      filePath: (context) => path.join(context.targetDir, `${context.name}.ts`),
      promptMessage: (context) =>
        `Implement the ${context.camelName} route handler. Make sure to:
        1. Use createHandler from @saflib/express
        2. Use types from your OpenAPI spec for request/response bodies
        3. Handle expected errors from service/DB layers
        4. Let unexpected errors propagate to central error handler
        5. Follow the pattern in the reference doc
        6. Export the handler from the folder's "index.ts" file`,
      stateName: "implementRoute",
      nextStateName: "reviewTestDocs",
    }),

    ...promptAgentComposer<AddRouteWorkflowContext>({
      promptForContext: ({ context }) =>
        `Read the testing guide.
      
      \`${context.testingGuide}\`

        Update the generated ${context.name}.test.ts file to follow these guidelines:
        1. Use supertest for making requests
        2. Test against the actual app with middleware
        3. Only mock expensive/external operations
        4. For success cases: check status and response body structure
        5. For error cases: only check status code
        6. Keep tests minimal and focused`,
      stateName: "reviewTestDocs",
      nextStateName: "updateTests",
    }),

    ...updateTemplateFileComposer<AddRouteWorkflowContext>({
      filePath: (context) =>
        path.join(context.targetDir, `${context.name}.test.ts`),
      promptMessage: (context) =>
        `Update the generated ${context.name}.test.ts file following the testing guide patterns. Make sure to implement proper test cases that cover both success and error scenarios.`,
      stateName: "updateTests",
      nextStateName: "runTests",
    }),

    ...runTestsComposer<AddRouteWorkflowContext>({
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

export class AddRouteWorkflow extends XStateWorkflow {
  machine = AddRouteWorkflowMachine;
  description = "Add a new route to an Express.js service.";
  cliArguments = [
    {
      name: "path",
      description: "Path of the new route (e.g. 'routes/todos/create')",
      exampleValue: "routes/example-subpath/example-route",
    },
  ];
  sourceUrl = import.meta.url;
}
