import { fromPromise, setup, assign, raise } from "xstate";
import {
  workflowActionImplementations,
  workflowActors,
  logInfo,
  logError,
  logWarn,
  promptAgent,
  type WorkflowContext,
  type FactoryFunctionOptions,
} from "./xstate.ts";
import {
  kebabCaseToPascalCase,
  kebabCaseToCamelCase,
  kebabCaseToSnakeCase,
} from "./utils.ts";
import { readFileSync } from "node:fs";
import {
  readdir,
  copyFile,
  readFile,
  writeFile,
  access,
} from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

export interface CopyTemplateMachineInput {
  name: string; // kebab-case name
  targetDir: string;
  sourceDir: string;
}

// Machines which invoke this one should include this context
export interface TemplateWorkflowContext extends WorkflowContext {
  name: string;
  pascalName: string;
  targetDir: string;
  sourceDir: string;
}

// This is context specific to this machine
interface CopyTemplateMachineContext extends TemplateWorkflowContext {
  sourceFiles: string[];
  targetFiles: string[];
  filesToCopy: string[];
}

function transformName(originalName: string, targetName: string): string {
  // Handle different naming conventions using utility functions
  const pascalTargetName = kebabCaseToPascalCase(targetName);
  const snakeTargetName = kebabCaseToSnakeCase(targetName);

  let result = originalName;

  // Replace all variations
  result = result.replace(/template-file/g, targetName);
  result = result.replace(/template_file/g, snakeTargetName);
  result = result.replace(/TemplateFile/g, pascalTargetName);

  return result;
}

export const CopyTemplateMachine = setup({
  types: {
    input: {} as CopyTemplateMachineInput,
    context: {} as CopyTemplateMachineContext,
  },
  actions: workflowActionImplementations,
  actors: workflowActors,
  guards: {
    hasMoreFiles: ({ context }) => context.filesToCopy.length > 0,
  },
}).createMachine({
  id: "copy-template",
  description: "Copy template files and rename placeholders",
  initial: "fetchFileNames",
  context: ({ input }) => ({
    name: input.name,
    pascalName: kebabCaseToPascalCase(input.name),
    targetDir: input.targetDir,
    sourceDir: input.sourceDir,
    sourceFiles: [],
    targetFiles: [],
    filesToCopy: [],
    loggedLast: false,
  }),
  entry: logInfo("Starting template copy workflow"),
  states: {
    fetchFileNames: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => {
          console.log("fetchFileNames", input);
          const { sourceDir, targetDir } = input;

          let sourceFiles: string[] = [];
          let targetFiles: string[] = [];

          try {
            sourceFiles = await readdir(sourceDir);
          } catch (error) {
            throw new Error(
              `Failed to read source folder: ${(error as Error).message}`,
            );
          }

          try {
            targetFiles = await readdir(targetDir);
          } catch (error) {
            // Target folder might not exist, that's okay
            targetFiles = [];
          }

          return { sourceFiles, targetFiles };
        }),
        onDone: {
          target: "copy",
          actions: [
            assign(({ event }) => ({
              sourceFiles: (
                event.output as { sourceFiles: string[]; targetFiles: string[] }
              ).sourceFiles,
              targetFiles: (
                event.output as { sourceFiles: string[]; targetFiles: string[] }
              ).targetFiles,
              filesToCopy: [
                ...(
                  event.output as {
                    sourceFiles: string[];
                    targetFiles: string[];
                  }
                ).sourceFiles,
              ],
            })),
            logInfo(
              ({ context }) =>
                `Found ${context.sourceFiles.length} files in source folder`,
            ),
          ],
        },
        onError: {
          target: "error",
          actions: logError(
            ({ event }) =>
              `Failed to fetch file names: ${(event.error as Error).message}`,
          ),
        },
      },
    },
    copy: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => {
          const { sourceDir, targetDir, name, filesToCopy } = input;

          if (filesToCopy.length === 0) {
            throw new Error("No files to copy");
          }

          const currentFile = filesToCopy[0];
          const sourcePath = path.join(sourceDir, currentFile);
          const targetFileName = transformName(currentFile, name);
          const targetPath = path.join(targetDir, targetFileName);

          // Check if target file already exists
          try {
            await access(targetPath, constants.F_OK);
            return { skipped: true, fileName: targetFileName };
          } catch {
            // File doesn't exist, proceed with copy
          }

          // Ensure target directory exists
          await import("node:fs/promises").then((fs) =>
            fs.mkdir(path.dirname(targetPath), { recursive: true }),
          );

          await copyFile(sourcePath, targetPath);
          return { skipped: false, fileName: targetFileName };
        }),
        onDone: [
          {
            guard: ({ event }) =>
              (event.output as { skipped: boolean; fileName: string }).skipped,
            target: "popFile",
            actions: logWarn(
              ({ event }) =>
                `File ${(event.output as { skipped: boolean; fileName: string }).fileName} already exists, skipping`,
            ),
          },
          {
            target: "rename",
            actions: logInfo(
              ({ event }) =>
                `Copied file to ${(event.output as { skipped: boolean; fileName: string }).fileName}`,
            ),
          },
        ],
        onError: {
          target: "error",
          actions: logError(
            ({ event }) =>
              `Failed to copy file: ${(event.error as Error).message}`,
          ),
        },
      },
    },
    rename: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => {
          const { targetDir, name, filesToCopy } = input;

          const currentFile = filesToCopy[0];
          const targetFileName = transformName(currentFile, name);
          const targetPath = path.join(targetDir, targetFileName);

          // Read file content
          const content = await readFile(targetPath, "utf-8");

          // Replace content placeholders
          let updatedContent = content;

          // Replace kebab-case placeholders
          updatedContent = updatedContent.replace(/template-file/g, name);

          // Replace snake_case placeholders
          const snakeName = kebabCaseToSnakeCase(name);
          updatedContent = updatedContent.replace(/template_file/g, snakeName);

          // Replace PascalCase placeholders
          const pascalName = kebabCaseToPascalCase(name);
          updatedContent = updatedContent.replace(/TemplateFile/g, pascalName);

          // Replace camelCase placeholders
          const camelName = kebabCaseToCamelCase(name);
          updatedContent = updatedContent.replace(/templateFile/g, camelName);

          // Write updated content back
          await writeFile(targetPath, updatedContent);

          return { fileName: targetFileName };
        }),
        onDone: {
          target: "popFile",
          actions: logInfo(
            ({ event }) =>
              `Renamed placeholders in ${(event.output as { fileName: string }).fileName}`,
          ),
        },
        onError: {
          target: "error",
          actions: logError(
            ({ event }) =>
              `Failed to rename placeholders: ${(event.error as Error).message}`,
          ),
        },
      },
    },
    popFile: {
      entry: assign(({ context }) => ({
        filesToCopy: context.filesToCopy.slice(1),
      })),
      always: [
        {
          guard: "hasMoreFiles",
          target: "copy",
        },
        {
          target: "done",
        },
      ],
    },
    done: {
      type: "final",
      entry: logInfo("Template copy workflow completed successfully"),
    },
    error: {
      type: "final",
      entry: logError("Template copy workflow failed"),
    },
  },
});

export function useTemplateStateFactory({
  stateName,
  nextStateName,
}: {
  stateName: string;
  nextStateName: string;
}) {
  return {
    [stateName]: {
      invoke: {
        input: ({ context }: { context: TemplateWorkflowContext }) => ({
          sourceDir: context.sourceDir,
          targetDir: context.targetDir,
          name: context.name,
        }),
        src: CopyTemplateMachine,
        onDone: {
          target: nextStateName,
          actions: logInfo(
            () => `Template files copied and renamed successfully.`,
          ),
        },
        onError: {
          actions: [
            logError(
              ({ event }: { event: any }) =>
                `Failed to copy and rename template: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              "Failed to copy and rename the template files. Please check if the source directory exists and you have the necessary permissions.",
          ),
        },
        continue: {
          reenter: true,
          target: stateName,
        },
      },
    },
  };
}

interface UpdateTemplateFileFactoryOptions<C extends WorkflowContext>
  extends FactoryFunctionOptions {
  filePath: string | ((context: C) => string);
  promptMessage: string | ((context: C) => string);
}

export function updateTemplateFileFactory<C extends TemplateWorkflowContext>({
  filePath,
  promptMessage,
  stateName,
  nextStateName,
}: UpdateTemplateFileFactoryOptions<C>) {
  return {
    [stateName]: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              typeof promptMessage === "string"
                ? () => promptMessage
                : ({ context }: { context: C }) => promptMessage(context),
            ),
          ],
        },
        continue: [
          {
            guard: ({ context }: { context: C }) => {
              const resolvedPath =
                typeof filePath === "string"
                  ? path.resolve(process.cwd(), filePath)
                  : path.resolve(process.cwd(), filePath(context));
              const content = readFileSync(resolvedPath, "utf-8");
              const hasTodos = /\btodo\b/i.test(content);
              return hasTodos;
            },
            target: stateName,
            actions: [
              logError(({ context }: { context: C }) => {
                const filePathStr =
                  typeof filePath === "string" ? filePath : filePath(context);
                return `File ${filePathStr} was not properly updated - it still contains TODO strings. Please complete the implementation. If it's unclear what needs to be done, ask for help.`;
              }),
            ],
          },
          {
            target: nextStateName,
          },
        ],
      },
    },
  };
}
