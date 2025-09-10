import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  TestStepMachine,
  DocStepMachine,
  defineWorkflow,
  step,
} from "@saflib/workflows";
import path from "node:path";
import { kebabCaseToPascalCase, kebabCaseToCamelCase } from "@saflib/utils";

const sourceDir = path.join(import.meta.dirname, "handler-template");

const input = [
  {
    name: "path",
    description: "Path of the new handler (e.g. 'routes/todos/create')",
    exampleValue: "routes/example-subpath/example-handler",
  },
] as const;

interface AddHandlerWorkflowContext {
  name: string;
  camelName: string; // e.g. createCallSeries
  targetDir: string;
  featureName: string; // e.g. "call-series"
  handlerPath: string; // e.g. "/routes/call-series/index.ts"
  pascalFeatureName: string; // e.g. "CallSeries"
  httpAppPath: string; // e.g. "/http.ts"
  appPath: string; // e.g. "/app.ts"
}

export const AddHandlerWorkflowDefinition = defineWorkflow<
  typeof input,
  AddHandlerWorkflowContext
>({
  id: "express/add-handler",

  description: "Add a new route to an Express.js service.",

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const targetDir = path.dirname(path.join(input.cwd, input.path));
    const featureName = path.basename(targetDir);

    const cwd = input.cwd;
    const handlerPath = path.join(targetDir, "index.ts").replace(cwd, "");
    const pascalFeatureName = kebabCaseToPascalCase(featureName);
    const httpAppPath = path.join(cwd, "http.ts").replace(cwd, "");
    const appPath = path.join(cwd, "app.ts").replace(cwd, "");
    const name = path.basename(input.path).split(".")[0];

    return {
      name,
      camelName: kebabCaseToCamelCase(name),
      targetDir,
      featureName,
      handlerPath,
      pascalFeatureName,
      httpAppPath,
      appPath,
    };
  },

  templateFiles: {
    handler: path.join(sourceDir, "template-file.ts"),
    test: path.join(sourceDir, "template-file.test.ts"),
  },

  docFiles: {
    refDoc: path.join(import.meta.dirname, "../docs/03-routes.md"),
    testingGuide: path.join(import.meta.dirname, "../docs/04-testing.md"),
  },

  steps: [
    step(DocStepMachine, () => ({
      docId: "refDoc",
    })),

    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Check if the feature router exists at \`${context.handlerPath}\`. If it doesn't exist, create it with the basic structure to export the new route handler.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Update the feature router at \`${context.handlerPath}\` to include the new route handler.
        1. Import the new handler from "./${context.name}.ts"
        2. Add the route to the router using the appropriate HTTP method
        3. Make sure to export a create${context.pascalFeatureName}Router function that returns the router`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Check if the HTTP app exists at \`${context.httpAppPath}\` or \`${context.appPath}\`. If neither exists, create one to mount your routes.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Update the HTTP app to include the feature router.
        1. Import the feature router: \`import { create${context.pascalFeatureName}Router } from "./routes/${context.featureName}/index.ts"\`
        2. Add the router to the app: \`app.use("/${context.featureName}", create${context.pascalFeatureName}Router())\`
        3. Make sure to add this before the error handlers`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "handler",
      promptMessage: `Implement the ${context.camelName} route handler. Make sure to:
        1. Use createHandler from @saflib/express
        2. Use types from your OpenAPI spec for request/response bodies
        3. Handle expected errors from service/DB layers
        4. Let unexpected errors propagate to central error handler
        5. Follow the pattern in the reference doc
        6. Export the handler from the folder's "index.ts" file`,
    })),

    step(DocStepMachine, () => ({
      docId: "testingGuide",
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Update the generated ${context.name}.test.ts file following the testing guide patterns. Make sure to implement proper test cases that cover both success and error scenarios.`,
    })),

    step(TestStepMachine, () => ({
      fileId: "test",
    })),
  ],
});
