import { fromPromise } from "xstate";
import type { CopyStepContext } from "./types.ts";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  kebabCaseToSnakeCase,
  kebabCaseToPascalCase,
  kebabCaseToCamelCase,
} from "../../../strings.ts";
import { resolveTemplateWorkflowAreas } from "./inline/index.ts";

export const renameNextFile = fromPromise(
  async ({ input }: { input: CopyStepContext }) => {
    const { name, filesToCopy, runMode, lineReplace, copiedFiles, workflowId, flags } =
      input;
    const currentFileId = filesToCopy[0];
    const targetPath = copiedFiles[currentFileId];
    const targetFileName = path.basename(targetPath);

    if (runMode === "dry" || runMode === "checklist") {
      return { fileName: targetFileName };
    }

    const stats = await stat(targetPath);
    const isDirectory = stats.isDirectory();
    if (isDirectory) {
      return { fileName: targetFileName };
    }

    const content = await readFile(targetPath, "utf-8");

    try {
      const contentLines = content.split("\n");
      const updatedContent = processFileContent({
        contentLines,
        name,
        lineReplace,
        workflowId,
        flags,
      });

      await writeFile(targetPath, updatedContent.join("\n"));

      return { fileName: targetFileName };
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
      console.error(
        `Failed to rename file ${targetFileName} in ${targetPath}: ${error.message}`,
      );
      throw error;
    }
  },
);

export interface ProcessFileContentParams {
  contentLines: string[];
  name?: string;
  lineReplace?: (line: string) => string;
  workflowId: string;
  flags?: Record<string, boolean>;
}

/**
 * Transforms a single line: DELETE_THIS_LINE → empty, apply lineReplace, apply name replacements.
 */
export function transformLine(
  line: string,
  name: string | undefined,
  lineReplace: ((line: string) => string) | undefined,
  snakeName: string,
  pascalName: string,
  camelName: string,
): string {
  if (line.includes("DELETE_THIS_LINE")) {
    return "";
  }
  if (line.includes("/* do not replace */")) {
    return line;
  }
  let out = line;
  if (lineReplace) {
    out = lineReplace(out);
  }
  if (name) {
    out = out.replace(/template-file/g, name);
    out = out.replace(/template_file/g, snakeName);
    out = out.replace(/TemplateFile/g, pascalName);
    out = out.replace(/templateFile/g, camelName);
    out = out.replace(/TEMPLATE_FILE/g, snakeName.toUpperCase());
  }
  return out;
}

/**
 * Processes file content: resolves workflow areas (IF/ELSE/ONCE) via the inline library,
 * then applies line-level transforms (lineReplace, name replacements).
 */
export function processFileContent({
  contentLines,
  name,
  lineReplace,
  workflowId,
  flags,
}: ProcessFileContentParams): string[] {
  const resolvedLines = resolveTemplateWorkflowAreas(
    contentLines,
    workflowId,
    flags,
  );

  const snakeName = kebabCaseToSnakeCase(name || "");
  const pascalName = kebabCaseToPascalCase(name || "");
  const camelName = kebabCaseToCamelCase(name || "");

  return resolvedLines.map((line) =>
    transformLine(line, name, lineReplace, snakeName, pascalName, camelName),
  );
}
