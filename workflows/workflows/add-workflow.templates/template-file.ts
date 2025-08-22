import { setup } from "xstate";
import {
  workflowActionImplementations,
  workflowActors,
  logInfo,
  XStateWorkflow,
  copyTemplateStateFactory,
  updateTemplateFileFactory,
  runTestsFactory,
  promptAgentFactory,
  type TemplateWorkflowContext,
  contextFromInput,
  type WorkflowInput,
  outputFromContext,
} from "@saflib/workflows";
import path from "node:path";
import { fileURLToPath } from "node:url";

// TODO: replace this with the actual input for your workflow
interface ToDoWorkflowInput extends WorkflowInput {
  name: string;
}

// TODO: Remove exampleProperty and replace it with the actual context properties your workflow needs
interface ToDoWorkflowContext extends TemplateWorkflowContext {
  // Add any additional context properties your workflow needs
  exampleProperty: string;
}

export const ToDoWorkflowMachine = setup({
  types: {
    input: {} as ToDoWorkflowInput,
    context: {} as ToDoWorkflowContext,
  },
  actions: workflowActionImplementations,
  actors: workflowActors,
}).createMachine({
  // TODO: replace "to-do" with the actual name of the workflow
  id: "to-do",
  description: "TODO: Describe what this workflow does",

  // TODO: Only keep "copyTemplate" if this workflow actually copies over template files
  // Otherwise, remove the template states and update this to the actual initial state
  initial: "copyTemplate",

  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // TODO: create the template-files dir and add template files
    // Include TODOs like this file does.
    const sourceDir = path.join(__dirname, "template-files");

    // TODO: replace "output" with where the files should actually go based on the input
    // This will probably be based on the inputs, such as the name of what is being created
    const targetDir = path.join(process.cwd(), "output");

    // TODO: Update to include the actual context properties from ToDoWorkflowContext
    return {
      name: input.name,
      pascalName: input.name.charAt(0).toUpperCase() + input.name.slice(1),
      sourceDir,
      targetDir,
      exampleProperty: "example value",
      ...contextFromInput(input),
    };
  },

  entry: logInfo("Successfully began workflow"),

  // TODO: update the states to match the actual workflow you're creating. It will usually involve some combination of copying template files, updating files, and running tests.
  states: {
    ...copyTemplateStateFactory({
      stateName: "copyTemplate",
      nextStateName: "updateMainFile",
    }),

    ...updateTemplateFileFactory<ToDoWorkflowContext>({
      filePath: (context) => path.join(context.targetDir, `${context.name}.ts`),
      promptMessage: (context) =>
        `Please update ${context.name}.ts to implement the main functionality. Replace any TODO comments with actual implementation.`,
      stateName: "updateMainFile",
      nextStateName: "updateConfigFile",
    }),

    ...updateTemplateFileFactory<ToDoWorkflowContext>({
      filePath: (context) =>
        path.join(context.targetDir, `${context.name}.config.ts`),
      promptMessage: (context) =>
        `Please update ${context.name}.config.ts with the appropriate configuration for this workflow.`,
      stateName: "updateConfigFile",
      nextStateName: "updateTests",
    }),

    ...updateTemplateFileFactory<ToDoWorkflowContext>({
      filePath: (context) =>
        path.join(context.targetDir, `${context.name}.test.ts`),
      promptMessage: (context) =>
        `Please update ${context.name}.test.ts to test the functionality you implemented. Make sure to mock any external dependencies.`,
      stateName: "updateTests",
      nextStateName: "runTests",
    }),

    ...runTestsFactory<ToDoWorkflowContext>({
      filePath: (context) =>
        path.join(context.targetDir, `${context.name}.test.ts`),
      stateName: "runTests",
      nextStateName: "verifyDone",
    }),

    ...promptAgentFactory<ToDoWorkflowContext>({
      stateName: "verifyDone",
      nextStateName: "done",
      promptForContext: ({ context }) =>
        `Please verify that the ${context.name} workflow is working correctly. Test the functionality manually and ensure all files are properly configured.`,
    }),

    done: {
      type: "final",
    },
  },
  output: outputFromContext,
});

export class ToDoWorkflow extends XStateWorkflow {
  machine = ToDoWorkflowMachine;
  description = "TODO: Describe what this workflow does";

  // TODO: Update to match the inputs described in ToDoWorkflowInput
  cliArguments = [
    {
      name: "name",
      description:
        "The name of the thing to create (e.g., 'my-component' or 'my-service')",
    },
  ];
  sourceUrl = import.meta.url;
}
