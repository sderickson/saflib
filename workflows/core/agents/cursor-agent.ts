import { printLineSlowly, shortTimestamp } from "./print.ts";
import { spawn } from "node:child_process";
import { addNewLinesToString } from "../../strings.ts";
import { writeFileSync } from "node:fs";
import { type PromptParam, type PromptResult } from "../types.ts";
import { popPendingMessages } from "./message.ts";
import { logFile, type CostTsvRow, appendToCostFile } from "./log.ts";
import { addTimeMs, getPercentTimeUsed, getTimeMs } from "./timeout.ts";

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

interface CodeResult {
  codeBlock: {
    relativeWorkspacePath: string;
    content: string;
  };
}

interface Todo {
  id: string;
  content: string;
  status:
    | "TODO_STATUS_IN_PROGRESS"
    | "TODO_STATUS_PENDING"
    | "TODO_STATUS_COMPLETED";
  createdAt: string;
  updatedAt: string;
}

interface CursorToolCallLog {
  type: "tool_call";
  session_id: string;
  subtype: "started" | "completed";
  tool_call: {
    readToolCall?: {
      args?: {
        path: string;
      };
      result?: {
        success: {};
      };
    };
    editToolCall?: {
      args?: {
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
      args: {
        todos: Todo[];
      };
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
          codeResults: CodeResult[];
        };
      };
    };
    readLintsToolCall?: {
      args: {
        paths: string[];
      };
      result?: {
        success: {
          totalFiles: number;
          totalDiagnostics: number;
        };
      };
    };
  };
}

interface CursorResultLog {
  type: "result";
  is_error: boolean;
  result: string;
  duration_api_ms: number;
  duration_ms: number;
  session_id: string;
  request_id: string;
}

type CursorLog =
  | CursorSystemLog
  | CursorUserLog
  | CursorAssistantLog
  | CursorToolCallLog
  | CursorResultLog;

const relativePath = (path: string) => {
  if (!path) {
    return "root dir";
  }
  return path.replace(process.cwd(), "");
};

export const executePromptWithCursor = async ({
  msg,
  context,
}: PromptParam): Promise<PromptResult> => {
  const t0 = Date.now();
  let duration_api_ms = 0;

  if (process.env.NODE_ENV === "test") {
    return { code: 0, sessionId: "test-session-id", shouldContinue: true };
  }

  // set up a promise to resolve when the agent is done
  let resolve: (value: PromptResult) => void;
  const p = new Promise<PromptResult>((r) => {
    resolve = r;
  });

  // prepending pending messages to the message
  const pendingMessages = popPendingMessages();
  if (pendingMessages.length > 0) {
    msg = pendingMessages.join("\n") + "\n" + msg;
  }

  // spawn the agent
  const args = ["-p", msg, "--output-format", "stream-json", "-f"];
  if (context.agentConfig?.sessionId) {
    printLineSlowly(`Resuming session ${context.agentConfig.sessionId}`);
    args.push("--resume");
    args.push(context.agentConfig.sessionId);
    args.push("--model", "composer-1");
  }
  const agent = spawn("cursor-agent", args);
  agent.stdin.end(); // or it hangs

  // receive the agent's output
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
          const lines = content.text
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
              `> Reading file: ${relativePath(json.tool_call.readToolCall.args?.path ?? "unknown path")}`,
            );
          } else if (json.subtype === "completed") {
            if (json.tool_call.readToolCall.result?.success) {
              printLineSlowly(
                `> File read: ${relativePath(json.tool_call.readToolCall.args?.path ?? "unknown path")}`,
              );
            } else {
              printLineSlowly(
                `> File read failed: ${relativePath(json.tool_call.readToolCall.args?.path ?? "unknown path")}`,
              );
            }
          }
        } else if (json.tool_call.editToolCall) {
          if (json.subtype === "started") {
            printLineSlowly(
              `> Writing file: ${relativePath(json.tool_call.editToolCall.args?.path ?? "unknown path")}`,
            );
          }
          if (json.subtype === "completed") {
            if (json.tool_call.editToolCall.result?.success) {
              printLineSlowly(
                `> File written: ${relativePath(json.tool_call.editToolCall.args?.path ?? "unknown path")}`,
              );
            } else {
              printLineSlowly(
                `> File write failed: ${relativePath(json.tool_call.editToolCall.args?.path ?? "unknown path")}`,
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
          const todos = json.tool_call.updateTodosToolCall.args.todos.map(
            (todo) => todo.content,
          );
          if (json.subtype === "started") {
            printLineSlowly(`> Updating todos:\n > ${todos.join("\n > ")}`);
          } else if (json.subtype === "completed") {
            printLineSlowly(`> Todos updated:\n > ${todos.join("\n > ")}`);
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
              const paths =
                json.tool_call.semSearchToolCall.result.success.codeResults.map(
                  (result) => result.codeBlock.relativeWorkspacePath,
                );
              printLineSlowly(`> Search results:\n > ${paths.join("\n > ")}`);
            }
          }
        } else if (json.tool_call.readLintsToolCall) {
          if (json.subtype === "started") {
            printLineSlowly(
              `> Reading lints: ${json.tool_call.readLintsToolCall.args.paths.join(", ")}`,
            );
          } else if (json.subtype === "completed") {
            if (json.tool_call.readLintsToolCall.result?.success) {
              printLineSlowly(
                `> Lints read: ${json.tool_call.readLintsToolCall.result.success.totalFiles} files, ${json.tool_call.readLintsToolCall.result.success.totalDiagnostics} diagnostics`,
              );
            }
          }
        } else {
          printLineSlowly(
            `> Unknown tool call: ${JSON.stringify(Object.keys(json.tool_call))}`,
          );
        }
      } else if (json.type === "result") {
        const t1 = Date.now();
        duration_api_ms = json.duration_api_ms ?? 0;
        const tsvRow: CostTsvRow = {
          timestamp_start: new Date(t0).toISOString(),
          timestamp_end: new Date(t1).toISOString(),
          duration_ms: (t1 - t0).toString(),
          duration_api_ms: duration_api_ms.toString(),
          status: json.is_error ? "Error" : "Success",
          request_id: json.request_id,
          message: msg.split("\n")[0],
        };
        appendToCostFile(tsvRow);
        printLineSlowly("\n---------- RESULT ---------- " + shortTimestamp());
        printLineSlowly(`> ${json.is_error ? "Error" : "Success"}`);
      }
    }
  });
  agent.stderr.on("data", (data) => {
    printLineSlowly("AGENT ERROR: " + shortTimestamp() + " " + data.toString());
  });
  agent.on("close", (code) => {
    if (!duration_api_ms) {
      throw new Error("Duration API ms is not set after agent execution");
    }
    const shouldContinue = !addTimeMs(duration_api_ms);
    if (!shouldContinue) {
      const workflowTimeMs = getTimeMs();
      printLineSlowly(
        "Workflow timed out after " + workflowTimeMs / 1000 + "s",
      );
    } else {
      const percentTimeUsed = getPercentTimeUsed();
      printLineSlowly(`Workflow % used: ${percentTimeUsed.toFixed(1)}%`);
    }

    resolve({ code, sessionId: sessionId ?? undefined, shouldContinue });
  });
  return p;
};
