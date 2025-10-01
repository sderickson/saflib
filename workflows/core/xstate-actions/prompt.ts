import { print } from "../utils.ts";
import { assign, type AnyEventObject } from "xstate";
import {
  type ActionParam,
  type WorkflowContext,
  type WorkflowActionFunction,
} from "../types.ts";
import { spawn } from "node:child_process";

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
    // space prompts from the original command, logs, and other prompts
    if (process.env.NODE_ENV === "test") {
      return {};
    }
    print("");
    if (context.systemPrompt) {
      print(context.systemPrompt);
      print("");
    }
    print(msg);
    print("");
    return {};
  },
);

interface PromptParam {
  msg: string;
  context: WorkflowContext;
}

export const printPrompt = ({ msg, context }: PromptParam) => {
  if (process.env.NODE_ENV === "test") {
    return {};
  }
  print("");
  if (context.systemPrompt) {
    print(context.systemPrompt);
    print("");
  }
  print(msg);
  print("");
  return {};
};

export const executePrompt = async ({ msg, context }: PromptParam) => {
  if (process.env.NODE_ENV === "test") {
    return { shouldContinue: true };
  }
  let resolve: (value: unknown) => void;
  const p = new Promise((r) => {
    resolve = r;
  });
  // const agent = spawn("cursor-agent", [
  //   "-p",
  //   '"Say hi"',
  //   // msg.replace('"', '\\"'),
  //   "--output-format",
  //   "stream-json",
  // ]);
  const agent = spawn("echo", ["hi1\nhi2\nhi3\nhi4"]);
  let buffer = "";
  agent.stdout.on("data", (data) => {
    const s = data.toString();
    // console.log("agent stdout", s);
    buffer += s;
    while (buffer.includes("\n")) {
      const line = buffer.split("\n")[0];
      buffer = buffer.slice(line.length + 1);
      console.log("\nagent stdout line", line, "\n");
    }
  });
  agent.stderr.on("data", (data) => {
    console.log("agent stderr", data);
  });
  agent.on("close", (code) => {
    console.log("agent closed with code", code);
    resolve({ code });
  });
  console.log(
    "executing prompt",
    msg,
    "with agent config",
    context.agentConfig,
  );
  return p;
};
