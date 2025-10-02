import { print } from "./utils.ts";
import { type WorkflowContext } from "./types.ts";
import { spawn } from "node:child_process";
import { addNewLinesToString } from "../strings.ts";
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
  subtype: "started" | "completed";
  tool_call: {
    readToolCall?: {
      args: {
        path: string;
      };
      result?: {
        success: {};
      };
    };
    editToolCall?: {
      args: {
        path: string;
        content: string;
      };
      result?: {
        success: {};
      };
    };
    globToolCall?: {
      args: {
        targetDirectory: string;
        globPattern: string;
      };
      result?: {
        success: {
          totalFiles: number;
          files: string[];
        };
      };
    };
    updateTodosToolCall?: {
      args: {};
      result?: {
        success: {};
      };
    };
  };
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

const relativePath = (path: string) => {
  return path.replace(process.cwd(), "");
};

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
      const json = JSON.parse(line) as CursorLog;
      writeFileSync(logFile, JSON.stringify(json, null, 2) + "\n", {
        flag: "a",
      });
      if (json.type === "system") {
        sessionId = json.session_id;
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
          console.log("\n---------- PROMPT ----------");
          console.log(lines);
        });
      } else if (json.type === "tool_call") {
        console.log("\n---------- TOOL CALL ----------");
        if (json.tool_call.readToolCall) {
          if (json.subtype === "started") {
            console.log(
              `> Reading file: ${relativePath(json.tool_call.readToolCall.args.path)}`,
            );
          } else if (json.subtype === "completed") {
            if (json.tool_call.readToolCall.result?.success) {
              console.log(
                `> File read: ${relativePath(json.tool_call.readToolCall.args.path)}`,
              );
            } else {
              console.error(
                `> File read failed: ${relativePath(json.tool_call.readToolCall.args.path)}`,
              );
            }
          }
        } else if (json.tool_call.editToolCall) {
          if (json.subtype === "started") {
            console.log(
              `> Writing file: ${relativePath(json.tool_call.editToolCall.args.path)}`,
            );
          }
          if (json.subtype === "completed") {
            if (json.tool_call.editToolCall.result?.success) {
              console.log(
                `> File written: ${relativePath(json.tool_call.editToolCall.args.path)}`,
              );
            } else {
              console.error(
                `> File write failed: ${relativePath(json.tool_call.editToolCall.args.path)}`,
              );
            }
          }
        } else if (json.tool_call.globToolCall) {
          if (json.subtype === "started") {
            console.log(
              `> Globbing files: ${relativePath(json.tool_call.globToolCall.args.globPattern)} in ${relativePath(json.tool_call.globToolCall.args.targetDirectory)}`,
            );
          } else if (json.subtype === "completed") {
            if (json.tool_call.globToolCall.result?.success) {
              console.log(
                `> Files globbed: ${json.tool_call.globToolCall.result.success.totalFiles}`,
                `> Files: ${json.tool_call.globToolCall.result.success.files.map((file) => relativePath(file)).join(", ")}`,
              );
            }
          }
        } else if (json.tool_call.updateTodosToolCall) {
          if (json.subtype === "started") {
            console.log(`> Updating todos`);
          } else if (json.subtype === "completed") {
            console.log(`> Todos updated`);
          }
        } else {
          console.error(
            `> Unknown tool call: ${JSON.stringify(Object.keys(json.tool_call))}`,
          );
        }
      } else if (json.type === "result") {
        console.log("\n---------- RESULT ----------");
        console.log(`> ${json.is_error ? "Error" : "Success"}`);
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
