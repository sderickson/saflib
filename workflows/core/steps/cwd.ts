import { setup } from "xstate";
import type { WorkflowInput, WorkflowOutput } from "../types.ts";
import { contextFromInput } from "../utils.ts";
import { workflowActions, workflowActors } from "../xstate.ts";
import path from "node:path";

/**
 * Input for the CwdStepMachine.
 */
export interface CwdStepInput {
  path: string;
}

export interface CwdStepContext {
  newCwd: string;
}
/**
 * Updates the current working directory for subsequent steps, such as "copy", "update", and "command".
 */
export const CwdStepMachine = setup({
  types: {
    input: {} as CwdStepInput & WorkflowInput,
    context: {} as CwdStepContext,
    output: {} as WorkflowOutput,
  },
  actions: {
    ...workflowActions,
  },
  actors: {
    ...workflowActors,
  },
}).createMachine({
  id: "cwd-step",
  initial: "done",
  context: ({ input, self }) => {
    return {
      ...contextFromInput(input, self),
      newCwd: path.join(process.cwd(), input.path),
    };
  },
  states: {
    done: {
      type: "final",
    },
  },
  output: ({ context }) => {
    return {
      checklist: {
        description: `Change working directory to ${context.newCwd}`,
      },
      newCwd: context.newCwd,
    };
  },
});
