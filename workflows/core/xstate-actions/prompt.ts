import { print } from "../utils.ts";
import { type WorkflowContext } from "../types.ts";
import { spawn } from "node:child_process";
import { addNewLinesToString } from "../../strings.ts";
import path from "node:path";
import { writeFileSync } from "node:fs";

interface PromptParam {
  msg: string;
  context: WorkflowContext;
}

export const handlePrompt = async ({
  msg,
  context,
}: PromptParam): Promise<PromptResult> => {
  if (process.env.NODE_ENV === "test") {
    return { code: 0, sessionId: "test-session-id", shouldContinue: true };
  }
  switch (context.runMode) {
    case "run":
      return await executePrompt({ msg, context });
    case "dry":
      return { code: 0, sessionId: undefined, shouldContinue: true };
    case "script":
      return { code: 0, sessionId: undefined, shouldContinue: true };
    case "print":
      printPrompt({ msg, context });
      return { code: 0, sessionId: undefined, shouldContinue: false };
    default:
      throw context.runMode satisfies never;
  }
};

export const printPrompt = ({ msg, context }: PromptParam) => {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  print("");
  if (context.systemPrompt) {
    print(context.systemPrompt);
    print("");
  }
  print(msg);
  print("");
  return;
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

export interface PromptResult {
  code: number | null;
  sessionId?: string;
  shouldContinue: boolean;
}

export const logFile = path.join(process.cwd(), "saf-workflow-prompt.log");

export const executePrompt = async ({
  msg,
  context,
}: PromptParam): Promise<PromptResult> => {
  if (process.env.NODE_ENV === "test") {
    return { code: 0, sessionId: "test-session-id", shouldContinue: true };
  }
  let resolve: (value: PromptResult) => void;
  const p = new Promise<PromptResult>((r) => {
    resolve = r;
  });
  const args = ["-p", msg, "--output-format", "stream-json", "-f"];
  if (context.agentConfig?.sessionId) {
    args.push("--resume");
    args.push(context.agentConfig.sessionId);
  }
  const agent = spawn("cursor-agent", args);
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
        // append to the log file
        writeFileSync(logFile, JSON.stringify(json, null, 2) + "\n", {
          flag: "a",
        });
        if (json.type === "system") {
          sessionId = json.session_id;
          // console.log(JSON.stringify(json, null, 2));
        } else if (json.type === "assistant") {
          json.message.content.forEach((content) => {
            const lines = addNewLinesToString(content.text)
              .split("\n")
              .map((line) => `> ${line}`)
              .join("\n")
              .trim();
            console.log("\n---------- AGENT OUTPUT ----------");
            console.log(lines);
          });
        } else if (json.type === "user") {
          json.message.content.forEach((content) => {
            const lines = addNewLinesToString(content.text)
              .split("\n")
              .map((line) => `> ${line}`)
              .join("\n")
              .trim();
            console.log("\n---------- TOOL INPUT ----------");
            console.log(lines);
          });
        } else {
          // console.log(JSON.stringify(json, null, 2));
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
    resolve({ code, sessionId: sessionId ?? undefined, shouldContinue: true });
  });
  return p;
};
