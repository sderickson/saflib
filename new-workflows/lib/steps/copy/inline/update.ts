import type { WorkflowAreaParam, WorkflowAreaState } from "./types.ts";
import {
  parseWorkflowAreaStart,
  resolveConditionalBlocks,
  isWorkflowAreaEnd,
} from "./parse.ts";
import { findTargetAreaIndices } from "./find.ts";
import { getNewLinesForNonSorted, getNewLinesForSorted } from "./lines.ts";

/**
 * Updates a sorted workflow area by filtering whitespace, adding new lines, and sorting.
 */
function updateSortedArea(
  result: string[],
  targetAreaStart: number,
  targetAreaEnd: number,
  newLines: string[],
): void {
  const areaContent = result.slice(targetAreaStart + 1, targetAreaEnd);

  const filteredContent = areaContent.filter((line) => line.trim().length > 0);

  if (newLines.length > 0) {
    const filteredNewLines = newLines.filter((line) => line.trim().length > 0);
    filteredContent.push(...filteredNewLines);
  }

  filteredContent.sort();

  result.splice(targetAreaStart + 1, areaContent.length, ...filteredContent);
}

/**
 * Updates a non-sorted workflow area by appending new lines.
 */
function updateNonSortedArea(
  result: string[],
  targetAreaEnd: number,
  newLines: string[],
): void {
  if (newLines.length > 0) {
    result.splice(targetAreaEnd, 0, ...newLines);
  }
}

/**
 * Processes a workflow area and updates the target file.
 * Handles ONCE (replace area with resolved content, remove markers) and IF/ELSE (choose branch by flags).
 */
function processWorkflowArea(
  result: string[],
  state: WorkflowAreaState,
  targetPath: string,
  lineReplace: (line: string) => string,
  flags: Record<string, boolean> | undefined,
): void {
  if (!state.appliesToWorkflow) {
    return;
  }

  const resolvedLines = resolveConditionalBlocks(
    state.workflowAreaLines,
    state.ifFlag,
    flags,
  );

  const indices = findTargetAreaIndices(
    result,
    state.areaStartLine,
    state.areaEndLine,
    state.areaName,
    targetPath,
  );

  if (!indices) {
    return;
  }

  const { start: targetAreaStart, end: targetAreaEnd } = indices;

  if (state.isOnce) {
    // ONCE: replace the entire region (BEGIN through END) with only the resolved content
    const transformedLines = resolvedLines.map(lineReplace);
    result.splice(
      targetAreaStart,
      targetAreaEnd - targetAreaStart + 1,
      ...transformedLines,
    );
    return;
  }

  // Non-ONCE: merge content into the area (existing behavior)
  const existingAreaContent = result.slice(targetAreaStart + 1, targetAreaEnd);

  let newLines: string[];
  if (state.isSorted) {
    newLines = getNewLinesForSorted(
      resolvedLines,
      existingAreaContent,
      lineReplace,
    );
  } else {
    newLines = getNewLinesForNonSorted(
      resolvedLines,
      existingAreaContent,
      lineReplace,
    );
  }

  if (state.isSorted) {
    updateSortedArea(result, targetAreaStart, targetAreaEnd, newLines);
  } else {
    updateNonSortedArea(result, targetAreaEnd, newLines);
  }
}

export function updateWorkflowAreas({
  targetLines,
  targetPath,
  sourceLines,
  workflowId,
  lineReplace,
  flags,
}: WorkflowAreaParam): string[] {
  const result = [...targetLines];

  let state: WorkflowAreaState | null = null;

  for (const sourceLine of sourceLines) {
    const areaStart = parseWorkflowAreaStart(sourceLine);
    if (areaStart) {
      state = {
        areaName: areaStart.areaName,
        areaStartLine: areaStart.fullLine,
        areaEndLine: "",
        workflowAreaLines: [],
        isSorted: areaStart.isSorted,
        appliesToWorkflow: areaStart.workflowIds.includes(workflowId),
        isOnce: areaStart.isOnce,
        ifFlag: areaStart.ifFlag,
        ifBlockLines: [],
        elseBlockLines: [],
      };
      continue;
    }

    if (!state) {
      continue;
    }

    if (isWorkflowAreaEnd(sourceLine)) {
      state.areaEndLine = sourceLine;
      processWorkflowArea(result, state, targetPath, lineReplace, flags);
      state = null;
      continue;
    }

    state.workflowAreaLines.push(sourceLine);
  }

  return result;
}
