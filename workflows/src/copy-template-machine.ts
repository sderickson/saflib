import { fromPromise, setup, assign } from "xstate";
import {
  workflowActionImplementations,
  workflowActors,
  logInfo,
  logError,
  logWarn,
  type WorkflowContext,
} from "./xstate.ts";
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
  sourceFolder: string;
  targetFolder: string;
  name: string; // kebab-case name
}

export interface CopyTemplateMachineContext extends WorkflowContext {
  sourceFolder: string;
  targetFolder: string;
  name: string;
  sourceFiles: string[];
  targetFiles: string[];
  filesToCopy: string[];
}

function transformName(originalName: string, targetName: string): string {
  // Handle different naming conventions
  const pascalTargetName = targetName
    .split("-")
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  const snakeTargetName = targetName.replace(/-/g, "_");

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
    sourceFolder: input.sourceFolder,
    targetFolder: input.targetFolder,
    name: input.name,
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
          const { sourceFolder, targetFolder } = input;

          let sourceFiles: string[] = [];
          let targetFiles: string[] = [];

          try {
            sourceFiles = await readdir(sourceFolder);
          } catch (error) {
            throw new Error(
              `Failed to read source folder: ${(error as Error).message}`,
            );
          }

          try {
            targetFiles = await readdir(targetFolder);
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
          const { sourceFolder, targetFolder, name, filesToCopy } = input;

          if (filesToCopy.length === 0) {
            throw new Error("No files to copy");
          }

          const currentFile = filesToCopy[0];
          const sourcePath = path.join(sourceFolder, currentFile);
          const targetFileName = transformName(currentFile, name);
          const targetPath = path.join(targetFolder, targetFileName);

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
          const { targetFolder, name, filesToCopy } = input;

          const currentFile = filesToCopy[0];
          const targetFileName = transformName(currentFile, name);
          const targetPath = path.join(targetFolder, targetFileName);

          // Read file content
          const content = await readFile(targetPath, "utf-8");

          // Replace content placeholders
          let updatedContent = content;

          // Replace kebab-case placeholders
          updatedContent = updatedContent.replace(/template-file/g, name);

          // Replace snake_case placeholders
          const snakeName = name.replace(/-/g, "_");
          updatedContent = updatedContent.replace(/template_file/g, snakeName);

          // Replace PascalCase placeholders
          const pascalName = name
            .split("-")
            .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
            .join("");
          updatedContent = updatedContent.replace(/TemplateFile/g, pascalName);

          // Replace camelCase placeholders
          const camelName = name
            .split("-")
            .map((part: string, index: number) =>
              index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
            )
            .join("");
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
