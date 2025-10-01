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

interface CursorSystemLog {
  type: "system";
  session_id: string;
}

interface CursorUserLog {
  type: "user";
  message: {
    content: [
      {
        type: "text";
        text: string;
      },
    ];
  };
  session_id: string;
}

interface CursorAssistantLog {
  type: "assistant";
  message: {
    content: [
      {
        type: "text";
        text: string;
      },
    ];
  };
  session_id: string;
}

interface CursorToolCallLog {
  type: "tool_call";
  session_id: string;
}

interface CursorResultLog {
  type: "result";
  is_error: boolean;
  result: string;
  session_id: string;
  request_id: string;
}

type CursorLog =
  | CursorSystemLog
  | CursorUserLog
  | CursorAssistantLog
  | CursorToolCallLog
  | CursorResultLog;

export interface ExecutePromptResult {
  code: number | null;
  sessionId: string;
}

export const executePrompt = async ({
  msg,
}: PromptParam): Promise<ExecutePromptResult> => {
  if (process.env.NODE_ENV === "test") {
    return { code: 0, sessionId: "test-session-id" };
  }
  let resolve: (value: ExecutePromptResult) => void;
  const p = new Promise<ExecutePromptResult>((r) => {
    resolve = r;
  });
  const agent = spawn("cursor-agent", [
    "-p",
    msg,
    "--output-format",
    "stream-json",
  ]);
  agent.stdin.end(); // or it hangs
  let buffer = "";
  let sessionId = "";
  agent.stdout.on("data", (data) => {
    const s = data.toString();
    buffer += s;
    while (buffer.includes("\n")) {
      const line = buffer.split("\n")[0];
      buffer = buffer.slice(line.length + 1);
      try {
        const json = JSON.parse(line) as CursorLog;
        if (json.type === "system") {
          sessionId = json.session_id;
        }
        if (json.type === "assistant") {
          json.message.content.forEach((content) => {
            console.log(
              "\n---------- AGENT OUTPUT ----------\n",
              content.text,
              "\n---------- END OUTPUT   ----------\n",
            );
          });
        }
        // console.log("agent stdout line", JSON.stringify(json, null, 2), "\n");
      } catch (error) {
        console.error("Unable to parse agent stdout line", line, "\n");
      }
    }
  });
  agent.stderr.on("data", (data) => {
    console.log("AGENT ERROR", data.toString());
  });
  agent.on("close", (code) => {
    resolve({ code, sessionId });
  });
  return p;
};
