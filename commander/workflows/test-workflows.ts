import {
  AddCLIWorkflowDefinition,
  AddCommandWorkflowDefinition,
} from "./index.ts";

import {
  defineWorkflow,
  step,
  makeWorkflowMachine,
  PromptStepMachine,
  CommandStepMachine,
} from "@saflib/workflows";

const input = [] as const;

interface TestCommanderWorkflowsContext {}

const TestCommanderWorkflowsDefinition = defineWorkflow<
  typeof input,
  TestCommanderWorkflowsContext
>({
  id: "commander/test-workflows",
  description: "Run all @saflib/commander workflows",
  input,
  context: () => ({}),
  sourceUrl: import.meta.url,
  templateFiles: {},
  docFiles: {},
  steps: [
    step(PromptStepMachine, () => ({
      promptText: `Go over the test goals.
      
      This is a test of the @saflib/commander workflows.
      
      The test goals are:
      - Add a new CLI
      - Add a new command to the CLI
      - Test the CLI and command, make sure it works
      - Clean up`,
    })),
    step(makeWorkflowMachine(AddCLIWorkflowDefinition), () => ({
      name: "hello-world",
    })),
    step(makeWorkflowMachine(AddCommandWorkflowDefinition), () => ({
      path: "bin/hello-world/echo.ts",
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "hello-world", "echo", "hello"],
    })),
    step(PromptStepMachine, () => ({
      promptText: `Check that everything looks good. Consider any difficulties you had while running the above workflows and changes you might make to the definitions.`,
    })),
  ],
});

export default TestCommanderWorkflowsDefinition;
