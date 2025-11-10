import {
  defineWorkflow,
  step,
  CopyStepMachine,
  UpdateStepMachine,
  CommandStepMachine,
  PromptStepMachine,
} from "@saflib/workflows";
import path from "node:path";

const input = [] as const;
interface TestAllWorkflowsContext {}

/**
 * A workflow that incorporates every generic workflow in the repo.
 * It makes sure there are at least no logical errors preventing workflows from running,
 * and that workflows that depend on one another are working correctly.
 *
 * Usage:
 * npm exec saf-workflow run-scripts ./test-all-workflows.ts
 *
 * It also runs as part of github actions on PRs.
 */
export const TestAllWorkflowsDefinition = defineWorkflow<
  typeof input,
  TestAllWorkflowsContext
>({
  id: "saflib/test-all-workflows",
  description: "Run all @saflib workflows.",
  input,
  context: () => ({}),
  sourceUrl: import.meta.url,
  templateFiles: {
    list: path.join(import.meta.dirname, "list.ts"),
  },
  docFiles: {},
  steps: [
    step(CopyStepMachine, () => ({
      name: "tmp-copy",
      targetDir: "./simple-test",
    })),
    step(UpdateStepMachine, () => ({
      fileId: "list",
      promptMessage:
        "Update the list.ts file to list the files in the current directory.",
    })),
    step(CommandStepMachine, () => ({
      command: "echo",
      args: ["hello"],
    })),
    step(PromptStepMachine, () => ({
      promptText: `Verify that the list.ts file is working correctly.
      
      - These
      - lines
      - are
      - basically
      - to
      - test
      - if
      - lines
      - are
      - printed
      - slowly`,
    })),
  ],
});

export default TestAllWorkflowsDefinition;
