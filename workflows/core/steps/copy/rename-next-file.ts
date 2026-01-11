import { fromPromise } from "xstate";
import type { CopyStepContext } from "./types.ts";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  kebabCaseToSnakeCase,
  kebabCaseToPascalCase,
  kebabCaseToCamelCase,
} from "../../../strings.ts";
import { parseWorkflowAreaStart, isWorkflowAreaEnd } from "./inline.ts";

export const renameNextFile = fromPromise(
  async ({ input }: { input: CopyStepContext }) => {
    const { name, filesToCopy, runMode, lineReplace, copiedFiles, workflowId } =
      input;
    const currentFileId = filesToCopy[0];
    const targetPath = copiedFiles[currentFileId];
    const targetFileName = path.basename(targetPath);

    if (runMode === "dry") {
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
}

/**
 * Processes file content by applying name replacements, line replacements,
 * and handling workflow areas. Returns the processed lines.
 */
export function processFileContent({
  contentLines,
  name,
  lineReplace,
  workflowId,
}: ProcessFileContentParams): string[] {
  const updatedContent = [...contentLines];
  const snakeName = kebabCaseToSnakeCase(name || "");
  const pascalName = kebabCaseToPascalCase(name || "");
  const camelName = kebabCaseToCamelCase(name || "");

  // Track if we're inside a workflow area and if it applies to this workflow
  let inWorkflowArea = false;
  let areaAppliesToWorkflow = false;

  for (var i = 0; i < updatedContent.length; i++) {
    const line = updatedContent[i];

    // Check if this is the start of a workflow area
    const areaStart = parseWorkflowAreaStart(line);
    const isAreaStart = areaStart !== null;
    const isAreaEnd = isWorkflowAreaEnd(line);

    if (isAreaStart) {
      inWorkflowArea = true;
      areaAppliesToWorkflow = areaStart.workflowIds.includes(workflowId);
      // BEGIN line should always be kept - continue to normal processing
    } else if (isAreaEnd) {
      inWorkflowArea = false;
      areaAppliesToWorkflow = false;
      // END line should always be kept - continue to normal processing
    } else if (inWorkflowArea && !areaAppliesToWorkflow) {
      // If we're inside a workflow area that doesn't apply to this workflow,
      // set the content line to empty and skip all replacements
      // (BEGIN and END lines are handled above and will be processed normally)
      updatedContent[i] = "";
      continue;
    }

    // Normal processing for lines outside workflow areas or inside applicable areas
    if (line.includes("DELETE_THIS_LINE")) {
      updatedContent[i] = "";
      continue;
    }
    if (line.includes("/* do not replace */")) {
      updatedContent[i] = line;
      continue;
    }

    if (lineReplace) {
      updatedContent[i] = lineReplace(updatedContent[i]);
    }
    if (name) {
      updatedContent[i] = updatedContent[i].replace(/template-file/g, name);
      updatedContent[i] = updatedContent[i].replace(
        /template_file/g,
        snakeName,
      );
      updatedContent[i] = updatedContent[i].replace(
        /TemplateFile/g,
        pascalName,
      );
      updatedContent[i] = updatedContent[i].replace(/templateFile/g, camelName);
      updatedContent[i] = updatedContent[i].replace(
        /TEMPLATE_FILE/g,
        snakeName.toUpperCase(),
      );
    }
  }

  return updatedContent;
}
