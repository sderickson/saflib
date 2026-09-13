import {
  WORKFLOW_AREA_START_REGEX,
  WORKFLOW_AREA_END_REGEX,
  WORKFLOW_AREA_ELSE_REGEX,
} from "./constants.ts";
import type { WorkflowAreaStartParsed } from "./types.ts";

/**
 * Parses the start line of a workflow area.
 * @returns Object with area info if it's a start line, null otherwise
 */
export function parseWorkflowAreaStart(line: string): WorkflowAreaStartParsed | null {
  const matches = WORKFLOW_AREA_START_REGEX.exec(line);
  if (!matches) {
    return null;
  }
  const [, onceMarker, sortedMarker, areaName, workflowIdsStr, ifFlag] = matches;
  return {
    areaName,
    workflowIds: workflowIdsStr.split(" ").filter(Boolean),
    isSorted: sortedMarker !== undefined,
    isOnce: onceMarker !== undefined,
    ifFlag: ifFlag ?? undefined,
    fullLine: line,
  };
}

/**
 * Checks if a line is the end of a workflow area.
 */
export function isWorkflowAreaEnd(line: string): boolean {
  return WORKFLOW_AREA_END_REGEX.test(line);
}

/**
 * Checks if a line is the ELSE marker inside a workflow area.
 */
export function isWorkflowAreaElse(line: string): boolean {
  return WORKFLOW_AREA_ELSE_REGEX.test(line);
}

/**
 * Splits area content lines into if-block (before ELSE) and else-block (after ELSE).
 * If there is no ELSE, all lines are in ifBlock and elseBlock is empty.
 */
export function splitIfElseBlocks(areaLines: string[]): {
  ifBlock: string[];
  elseBlock: string[];
} {
  const elseIndex = areaLines.findIndex((line) => isWorkflowAreaElse(line));
  if (elseIndex === -1) {
    return { ifBlock: areaLines, elseBlock: [] };
  }
  return {
    ifBlock: areaLines.slice(0, elseIndex),
    elseBlock: areaLines.slice(elseIndex + 1),
  };
}

/**
 * Resolves which block to use when an area has IF <flag>.
 * Returns the chosen lines (if-block when flag is true, else-block when false).
 * If no IF, returns all area lines.
 */
export function resolveConditionalBlocks(
  areaLines: string[],
  ifFlag: string | undefined,
  flags: Record<string, boolean> | undefined,
): string[] {
  const { ifBlock, elseBlock } = splitIfElseBlocks(areaLines);
  if (!ifFlag) {
    // No IF: use all lines (ifBlock is everything, elseBlock empty)
    return ifBlock;
  }
  const flagValue = flags?.[ifFlag] ?? false;
  return flagValue ? ifBlock : elseBlock;
}
