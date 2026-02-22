import { setup } from "xstate";
import type { WorkflowInput, WorkflowOutput } from "../types.ts";
import { contextFromInput } from "../utils.ts";
import { workflowActions, workflowActors } from "../xstate.ts";
import path from "node:path";
import { existsSync } from "node:fs";

/**
 * Input for the CdStepMachine.
 */
export interface CdStepInput {
  path: string;
}

/**
 * Old name
 * @deprecated Use CdStepInput instead.
 */
export type CwdStepInput = CdStepInput;

/**
 * @internal
 */
export interface CdStepContext {
  newCwd: string;
}

/**
 * Updates the current working directory for subsequent steps, such as "copy", "update", and "command".
 */
export const CdStepMachine = setup({
  types: {
    input: {} as CdStepInput & WorkflowInput,
    context: {} as CdStepContext,
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
    // In checklist/dry/script mode, skip validation so workflow can produce a checklist from any cwd
    const runMode = input.runMode ?? "print";
    if (runMode === "print" || runMode === "run") {
      if (!existsSync(newCwd)) {
        throw new Error(
          `Directory ${newCwd} does not exist. You should only cd into packages.`,
        );
      }
      const packagePath = path.join(newCwd, "package.json");
      if (!existsSync(packagePath)) {
        throw new Error(
          `Package.json not found in ${newCwd}. You should only cd into packages.`,
        );
      }
    }
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

/**
 * Old name. Use CdStepMachine instead.
 * @deprecated.
 */
export const CwdStepMachine = CdStepMachine;
