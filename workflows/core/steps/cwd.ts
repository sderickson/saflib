import { setup } from "xstate";
import type { WorkflowInput, WorkflowOutput } from "../types.ts";
import { contextFromInput } from "../utils.ts";
import { workflowActions, workflowActors } from "../xstate.ts";
import path from "node:path";

/**
 * Input for the CdStepMachine.
 */
export interface CwdStepInput {
  path: string;
}

/**
 * @internal
 */
export interface CwdStepContext {
  newCwd: string;
}
/**
 * Updates the current working directory for subsequent steps, such as "copy", "update", and "command".
 */
export const CdStepMachine = setup({
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
  context: ({ input }) => {
    const newCwd = input.path.startsWith("/")
      ? input.path
      : path.join(process.cwd(), input.path);
    return {
      ...contextFromInput(input),
      newCwd,
    };
  },
  states: {
    done: {
      type: "final",
    },
  },
  output: ({ context }) => {
    const actualCwd = process.cwd();
    const relativeCwd = path.relative(actualCwd, context.newCwd);
    return {
      checklist: {
        description: `Change working directory to ${relativeCwd}`,
      },
      newCwd: context.newCwd,
    };
  },
});
