import { fromPromise } from "xstate";
import type { CopyStepContext } from "./types.ts";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  kebabCaseToSnakeCase,
  kebabCaseToPascalCase,
  kebabCaseToCamelCase,
} from "../../../strings.ts";
import {
  parseWorkflowAreaStart,
  isWorkflowAreaEnd,
  isWorkflowAreaElse,
  resolveConditionalBlocks,
} from "./inline/index.ts";

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

function transformLine(
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
 * Processes file content by applying name replacements, line replacements,
 * and handling workflow areas (including IF/ELSE/ONCE). Returns the processed lines.
 */
export function processFileContent({
  contentLines,
  name,
  lineReplace,
  workflowId,
  flags,
}: ProcessFileContentParams): string[] {
  const snakeName = kebabCaseToSnakeCase(name || "");
  const pascalName = kebabCaseToPascalCase(name || "");
  const camelName = kebabCaseToCamelCase(name || "");

  const result: string[] = [];
  let inWorkflowArea = false;
  let areaAppliesToWorkflow = false;
  let areaIsConditional = false;
  let areaStartLine: string | null = null;
  let areaIsOnce = false;
  let areaIfFlag: string | undefined = undefined;
  let areaBuffer: string[] = [];

  for (let i = 0; i < contentLines.length; i++) {
    const line = contentLines[i];
    const areaStart = parseWorkflowAreaStart(line);
    const isAreaEnd = isWorkflowAreaEnd(line);

    if (areaStart) {
      inWorkflowArea = true;
      areaAppliesToWorkflow = areaStart.workflowIds.includes(workflowId);
      areaIsConditional =
        areaAppliesToWorkflow && (areaStart.ifFlag !== undefined || areaStart.isOnce);
      areaStartLine = areaStart.fullLine;
      areaIsOnce = areaStart.isOnce;
      areaIfFlag = areaStart.ifFlag;

      if (areaIsConditional) {
        areaBuffer = [];
      } else {
        result.push(
          transformLine(
            line,
            name,
            lineReplace,
            snakeName,
            pascalName,
            camelName,
          ),
        );
      }
      continue;
    }

    if (isAreaEnd && inWorkflowArea) {
      if (areaIsConditional && areaAppliesToWorkflow && areaStartLine) {
        const resolved = resolveConditionalBlocks(
          areaBuffer,
          areaIfFlag,
          flags,
        );
        const transformed = resolved.map((l) =>
          transformLine(l, name, lineReplace, snakeName, pascalName, camelName),
        );
        if (areaIsOnce) {
          result.push(...transformed);
        } else {
          result.push(
            transformLine(
              areaStartLine,
              name,
              lineReplace,
              snakeName,
              pascalName,
              camelName,
            ),
          );
          result.push(...transformed);
          result.push(
            transformLine(
              line,
              name,
              lineReplace,
              snakeName,
              pascalName,
              camelName,
            ),
          );
        }
      } else {
        // Area doesn't apply or not conditional: keep END line
        result.push(
          transformLine(
            line,
            name,
            lineReplace,
            snakeName,
            pascalName,
            camelName,
          ),
        );
      }
      inWorkflowArea = false;
      areaAppliesToWorkflow = false;
      areaIsConditional = false;
      areaStartLine = null;
      areaBuffer = [];
      continue;
    }

    if (inWorkflowArea && areaIsConditional && areaAppliesToWorkflow) {
      if (!isElse) {
        areaBuffer.push(line);
      }
      continue;
    }

    if (inWorkflowArea && !areaAppliesToWorkflow) {
      result.push("");
      continue;
    }

    if (inWorkflowArea && areaAppliesToWorkflow && !areaIsConditional) {
      result.push(
        transformLine(
          line,
          name,
          lineReplace,
          snakeName,
          pascalName,
          camelName,
        ),
      );
      continue;
    }

    // Outside any workflow area
    result.push(
      transformLine(
        line,
        name,
        lineReplace,
        snakeName,
        pascalName,
        camelName,
      ),
    );
  }

  return result;
}
