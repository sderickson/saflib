import { printLineSlowly, shortTimestamp } from "./print.ts";
import { spawn } from "node:child_process";
import { addNewLinesToString } from "../../strings.ts";
import path from "node:path";
import { writeFileSync } from "node:fs";
import { type PromptParam, type PromptResult } from "../types.ts";

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

interface DirectoryTree {
  absPath: string;
  childrenDirs: DirectoryTree[];
  childrenFiles: {
    name: string;
  }[];
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
        targetDirectory?: string;
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
    shellToolCall?: {
      args: {
        command: string;
      };
      result?: {
        success: {};
        failure: {
          stdout: string;
          stderr: string;
        };
      };
    };
    grepToolCall?: {
      args: {
        pattern: string;
        path?: string;
      };
      result?: {
        success: {
          workspaceResults: {
            [folderPath: string]: {
              content?: {
                totalLines?: number;
              };
            };
          };
        };
      };
    };
    lsToolCall?: {
      args: {
        path: string;
      };
      result?: {
        success: {
          directoryTreeRoot: {};
        };
      };
    };
    semSearchToolCall?: {
      args: {
        query: string;
      };
      result?: {
        success: {
          results: string;
        };
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

export const logFile = path.join(process.cwd(), "saf-workflow-prompt.log");

const relativePath = (path: string) => {
  if (!path) {
    return "root dir";
  }
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
          printLineSlowly("\n---------- AGENT ---------- " + shortTimestamp());
          printLineSlowly(lines);
        });
      } else if (json.type === "user") {
        json.message.content.forEach((content) => {
          const lines = addNewLinesToString(content.text)
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n")
            .trim();
          printLineSlowly("\n---------- PROMPT ---------- " + shortTimestamp());
          printLineSlowly(lines);
        });
      } else if (json.type === "tool_call") {
        printLineSlowly("\n---------- TOOL ---------- " + shortTimestamp());
        if (json.tool_call.readToolCall) {
          if (json.subtype === "started") {
            printLineSlowly(
              `> Reading file: ${relativePath(json.tool_call.readToolCall.args.path)}`,
            );
          } else if (json.subtype === "completed") {
            if (json.tool_call.readToolCall.result?.success) {
              printLineSlowly(
                `> File read: ${relativePath(json.tool_call.readToolCall.args.path)}`,
              );
            } else {
              printLineSlowly(
                `> File read failed: ${relativePath(json.tool_call.readToolCall.args.path)}`,
              );
            }
          }
        } else if (json.tool_call.editToolCall) {
          if (json.subtype === "started") {
            printLineSlowly(
              `> Writing file: ${relativePath(json.tool_call.editToolCall.args.path)}`,
            );
          }
          if (json.subtype === "completed") {
            if (json.tool_call.editToolCall.result?.success) {
              printLineSlowly(
                `> File written: ${relativePath(json.tool_call.editToolCall.args.path)}`,
              );
            } else {
              printLineSlowly(
                `> File write failed: ${relativePath(json.tool_call.editToolCall.args.path)}`,
              );
            }
          }
        } else if (json.tool_call.globToolCall) {
          if (json.subtype === "started") {
            printLineSlowly(
              `> Globbing files: ${relativePath(json.tool_call.globToolCall.args.globPattern)} in ${relativePath(json.tool_call.globToolCall.args.targetDirectory || "entire project")}`,
            );
          } else if (json.subtype === "completed") {
            if (json.tool_call.globToolCall.result?.success) {
              printLineSlowly(
                `> Files globbed: ${json.tool_call.globToolCall.result.success.totalFiles}`,
              );
              printLineSlowly(
                `> Files: ${json.tool_call.globToolCall.result.success.files.map((file) => relativePath(file)).join(", ")}`,
              );
            }
          }
        } else if (json.tool_call.updateTodosToolCall) {
          if (json.subtype === "started") {
            printLineSlowly(`> Updating todos`);
          } else if (json.subtype === "completed") {
            printLineSlowly(`> Todos updated`);
          }
        } else if (json.tool_call.shellToolCall) {
          if (json.subtype === "started") {
            printLineSlowly(
              `> Running command: ${json.tool_call.shellToolCall.args.command}`,
            );
          } else if (json.subtype === "completed") {
            if (json.tool_call.shellToolCall.result?.success) {
              printLineSlowly(`> Command successful`);
            } else {
              printLineSlowly(`> Command failed`);
              printLineSlowly(
                json.tool_call.shellToolCall.result?.failure.stderr ?? "",
              );
            }
          }
        } else if (json.tool_call.grepToolCall) {
          if (json.subtype === "started") {
            printLineSlowly(
              `> Grepping files: "${json.tool_call.grepToolCall.args.pattern}" in "${relativePath(json.tool_call.grepToolCall.args.path ?? "project root")}"`,
            );
          }
          if (json.subtype === "completed") {
            if (json.tool_call.grepToolCall.result?.success) {
              const workspaces = Object.values(
                json.tool_call.grepToolCall.result.success.workspaceResults,
              );
              const linesFound = workspaces.reduce(
                (acc, workspace) => acc + (workspace.content?.totalLines || 0),
                0,
              );
              printLineSlowly(`> Grep successful: ${linesFound} lines found`);
            }
          }
        } else if (json.tool_call.lsToolCall) {
          if (json.subtype === "started") {
            printLineSlowly(
              `> Listing files: ${relativePath(json.tool_call.lsToolCall.args.path)}`,
            );
          }
          if (json.subtype === "completed") {
            if (json.tool_call.lsToolCall.result?.success) {
              const directoryTree = json.tool_call.lsToolCall.result.success
                .directoryTreeRoot as DirectoryTree;
              const dirs = [directoryTree];
              let numFiles = 0;
              let numDirs = 0;
              while (dirs.length > 0) {
                const dir = dirs.shift();
                if (dir) {
                  dirs.push(...dir.childrenDirs);
                  numFiles += dir.childrenFiles.length;
                  numDirs += 1;
                }
              }
              printLineSlowly(`> Files listed: ${numFiles}`);
              printLineSlowly(`> Dirs listed: ${numDirs}`);
            }
          }
        } else if (json.tool_call.semSearchToolCall) {
          if (json.subtype === "started") {
            printLineSlowly(
              `> Searching for: ${json.tool_call.semSearchToolCall.args.query}`,
            );
          }
          if (json.subtype === "completed") {
            if (json.tool_call.semSearchToolCall.result?.success) {
              printLineSlowly(
                `> Search results: ${json.tool_call.semSearchToolCall.result.success.results}`,
              );
            }
          }
        } else {
          printLineSlowly(
            `> Unknown tool call: ${JSON.stringify(Object.keys(json.tool_call))}`,
          );
        }
      } else if (json.type === "result") {
        printLineSlowly("\n---------- RESULT ---------- " + shortTimestamp());
        printLineSlowly(`> ${json.is_error ? "Error" : "Success"}`);
      }
    }
  });
  agent.stderr.on("data", (data) => {
    printLineSlowly("AGENT ERROR: " + shortTimestamp() + " " + data.toString());
  });
  agent.on("close", (code) => {
    resolve({ code, sessionId: sessionId ?? undefined, shouldContinue: true });
  });
  return p;
};
