import { parseWorkflowAreaStart, isWorkflowAreaEnd, resolveConditionalBlocks } from "./parse.ts";

/**
 * Resolves workflow areas in template source lines (e.g. for initial file creation).
 * Does not apply lineReplace or other line transforms; returns structural resolution only.
 *
 * - Areas that don't apply to workflowId: content lines are dropped (empty), BEGIN/END kept.
 * - Areas with IF/ELSE: chooses branch based on flags, outputs only that branch.
 * - ONCE areas: outputs only the resolved content (no BEGIN/ELSE/END markers).
 * - Non-ONCE conditional areas: outputs BEGIN, resolved content, END.
 * - Non-conditional areas that apply: pass through all lines.
 */
export function resolveTemplateWorkflowAreas(
  sourceLines: string[],
  workflowId: string,
  flags?: Record<string, boolean>,
): string[] {
  const result: string[] = [];
  let inWorkflowArea = false;
  let areaAppliesToWorkflow = false;
  let areaIsConditional = false;
  let areaStartLine: string | null = null;
  let areaIsOnce = false;
  let areaIfFlag: string | undefined = undefined;
  let areaBuffer: string[] = [];

  for (let i = 0; i < sourceLines.length; i++) {
    const line = sourceLines[i];
    const areaStart = parseWorkflowAreaStart(line);
    const isAreaEnd = isWorkflowAreaEnd(line);

    if (areaStart) {
      inWorkflowArea = true;
      areaAppliesToWorkflow = areaStart.workflowIds.includes(workflowId);
      areaIsConditional =
        areaAppliesToWorkflow &&
        (areaStart.ifFlag !== undefined || areaStart.isOnce);
      areaStartLine = areaStart.fullLine;
      areaIsOnce = areaStart.isOnce;
      areaIfFlag = areaStart.ifFlag;

      if (areaIsConditional) {
        areaBuffer = [];
      } else {
        result.push(line);
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
        if (areaIsOnce) {
          result.push(...resolved);
        } else {
          result.push(areaStartLine);
          result.push(...resolved);
          result.push(line);
        }
      } else {
        result.push(line);
      }
      inWorkflowArea = false;
      areaAppliesToWorkflow = false;
      areaIsConditional = false;
      areaStartLine = null;
      areaBuffer = [];
      continue;
    }

    if (inWorkflowArea && areaIsConditional && areaAppliesToWorkflow) {
      areaBuffer.push(line);
      continue;
    }

    if (inWorkflowArea && !areaAppliesToWorkflow) {
      result.push("");
      continue;
    }

    if (inWorkflowArea && areaAppliesToWorkflow && !areaIsConditional) {
      result.push(line);
      continue;
    }

    result.push(line);
  }

  return result;
}
