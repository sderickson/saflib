import {
  defineWorkflow,
  // step,
  // makeWorkflowMachine,
  // CdStepMachine,
  // CommandStepMachine,
} from "@saflib/workflows";

// TODO: Import workflows from the appropriate packages

import path from "path";

const input = [] as const;

interface __TargetName__WorkflowContext {}

export const __TargetName__WorkflowDefinition = defineWorkflow<
  typeof input,
  __TargetName__WorkflowContext
>({
  id: "plans/__target-name__",
  description: "Project __target-name__ workflow",
  input,
  context: () => ({}),
  sourceUrl: import.meta.url,
  templateFiles: {},
  docFiles: {
    spec: path.join(import.meta.dirname, "spec.md"),
  },

  steps: [
    // TODO: Add steps here for implement the spec.
    // Mostly it should be Cd steps to move into the appropriate directory, then
    // makeWorkflowMachine calls to the appropriate workflows to implement the spec.

    // step(CdStepMachine, () => ({
    //   path: "./secrets/secrets-db",
    // })),

    // TODO: For each workflow, include a prompt which guides the agent doing the implementation.
    // step(makeWorkflowMachine(UpdateSchemaWorkflowDefinition), () => ({
    //   path: "schemas/foo.ts",
    //   prompt: `...`,
    // })),
  ],
});

export default __TargetName__WorkflowDefinition;
