import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  TestStepMachine,
  DocStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
  type ParsePackageNameOutput,
  type ParsePathOutput,
  parsePath,
  parsePackageName,
  getPackageName,
  makeLineReplace,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates/routes/example");

const input = [
  {
    name: "path",
    description: "Path of the new handler (e.g. 'routes/todos/create')",
    exampleValue: "./routes/example-subpath/example-handler.ts",
  },
] as const;

interface AddHandlerWorkflowContext
  extends ParsePackageNameOutput,
    ParsePathOutput {}

export const AddHandlerWorkflowDefinition = defineWorkflow<
  typeof input,
  AddHandlerWorkflowContext
>({
  id: "express/add-handler",

  description: "Add a new route to an Express.js service.",

  checklistDescription: ({ packageName, targetName }) =>
    `Add ${targetName} route handler to ${packageName}.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePackageName(getPackageName(input.cwd), {}),
      ...parsePath(input.path, {
        requiredSuffix: ".ts",
        cwd: input.cwd,
        requiredPrefix: "./routes/",
      }),
    };
  },

  templateFiles: {
    handler: path.join(sourceDir, "__target-name__.ts"),
    test: path.join(sourceDir, "__target-name__.test.ts"),
    index: path.join(sourceDir, "index.ts"),
  },

  docFiles: {
    refDoc: path.join(import.meta.dirname, "../docs/03-routes.md"),
    testingGuide: path.join(import.meta.dirname, "../docs/04-testing.md"),
  },

  steps: [
    step(PromptStepMachine, () => ({
      promptText: `Make sure this package has the correct spec package installed.
      
      Run \`npm install\` to install it if it's not already installed.
      If you don't know what route is being added as a handler, ask.`,
    })),

    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "index",
      promptMessage: `Update the feature router to include the new route handler.
      It is located at \`${context.copiedFiles!.index}\`.
        1. Import the new handler from "./${context.targetName}.ts"
        2. Add the route to the router using the appropriate HTTP method`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Update the root http.ts file to include the feature router, if not already there.
        1. Import the feature router that was just exported from the index.ts file
        2. Add the router to the app with "app.use"
        3. Make sure to add this before the error handlers`,
    })),

    step(DocStepMachine, () => ({
      docId: "refDoc",
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Check if routes/_helpers.ts has mapper functions for converting database models to API response types for this ${context.targetName} handler.

If mapper functions don't exist for the database models used by this endpoint, add them to routes/_helpers.ts following patterns shown there.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "handler",
      promptMessage: `Implement the ${context.targetName} route handler. Make sure to:
        1. Use createHandler from @saflib/express
        2. Use types from your OpenAPI spec for request/response bodies
        3. Use mapper functions from routes/_helpers.ts to convert database models to API responses
        4. Handle expected errors from service/DB layers
        5. Let unexpected errors propagate to central error handler (no try/catch)
        6. Follow the pattern in the reference doc
        7. Export the handler from the folder's "index.ts" file`,
    })),

    step(DocStepMachine, () => ({
      docId: "testingGuide",
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Update the generated ${context.targetName}.test.ts file following the testing guide patterns. Make sure to implement proper test cases that cover both success and error scenarios.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(TestStepMachine, () => ({
      fileId: "test",
    })),
  ],
});
