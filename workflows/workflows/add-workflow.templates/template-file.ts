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
  getPackageName,
  contextFromInput,
  type WorkflowInput,
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
  id: "to-do",
  description: "TODO: Describe what this workflow does",
  initial: "copyTemplate",
  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // TODO: create the template dir and files in there, then update sourceDir to point to it
    const sourceDir = path.join(__dirname, "template-files");
    // TODO: replace "output" with where the files should actually go based on the input
    const targetDir = path.join(process.cwd(), "output");

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
    // First copy over the template files
    ...copyTemplateStateFactory({
      stateName: "copyTemplate",
      nextStateName: "updateMainFile",
    }),

    // Update the main file with your logic
    ...updateTemplateFileFactory<ToDoWorkflowContext>({
      filePath: (context) => path.join(context.targetDir, `${context.name}.ts`),
      promptMessage: (context) =>
        `Please update ${context.name}.ts to implement the main functionality. Replace any TODO comments with actual implementation.`,
      stateName: "updateMainFile",
      nextStateName: "updateConfigFile",
    }),

    // Update a configuration file
    ...updateTemplateFileFactory<ToDoWorkflowContext>({
      filePath: (context) =>
        path.join(context.targetDir, `${context.name}.config.ts`),
      promptMessage: (context) =>
        `Please update ${context.name}.config.ts with the appropriate configuration for this workflow.`,
      stateName: "updateConfigFile",
      nextStateName: "updateTests",
    }),

    // Update the test file
    ...updateTemplateFileFactory<ToDoWorkflowContext>({
      filePath: (context) =>
        path.join(context.targetDir, `${context.name}.test.ts`),
      promptMessage: (context) =>
        `Please update ${context.name}.test.ts to test the functionality you implemented. Make sure to mock any external dependencies.`,
      stateName: "updateTests",
      nextStateName: "runTests",
    }),

    // Run the tests to make sure everything works
    ...runTestsFactory<ToDoWorkflowContext>({
      filePath: (context) =>
        path.join(context.targetDir, `${context.name}.test.ts`),
      stateName: "runTests",
      nextStateName: "verifyDone",
    }),

    // Final verification step
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
});

export class ToDoWorkflow extends XStateWorkflow {
  machine = ToDoWorkflowMachine;
  description = "TODO: Describe what this workflow does";
  cliArguments = [
    {
      name: "name",
      description:
        "The name of the thing to create (e.g., 'my-component' or 'my-service')",
    },
  ];
  packageName = getPackageName(import.meta.url);
}
