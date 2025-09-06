import { print } from "../utils.ts";
import { assign, type AnyEventObject } from "xstate";
import {
  type ActionParam,
  type WorkflowContext,
  type WorkflowActionFunction,
} from "../types.ts";

/**
 * Action builder for prompting the agent.
 */
export const promptAgent = <C, E extends AnyEventObject>(
  cb: string | ((ctx: ActionParam<C, E>) => string),
) => {
  return {
    type: "prompt" as const,
    params: (event: ActionParam<C, E>) => ({
      msg: typeof cb === "function" ? cb(event) : cb,
    }),
  };
};

export interface PromptParams {
  msg: string;
}

export const promptImpl: WorkflowActionFunction<
  any,
  AnyEventObject,
  PromptParams
> = assign(
  ({ context }: { context: WorkflowContext }, { msg }: PromptParams) => {
    if (context.systemPrompt) {
      print(context.systemPrompt);
      print("");
    }
    print(msg);
    print("");
    return { loggedLast: false };
  },
);
