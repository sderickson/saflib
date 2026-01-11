export interface WorkflowAreaParam {
  targetPath: string;
  targetLines: string[];
  sourceLines: string[];
  workflowId: string;
  lineReplace: (line: string) => string;
}

/**
 * Regex pattern to match the start of a workflow area.
 * Matches: "BEGIN WORKFLOW AREA <name> FOR <workflowIds>" or "BEGIN SORTED WORKFLOW AREA <name> FOR <workflowIds>"
 * Groups: [1] = "SORTED " or undefined, [2] = area name, [3] = workflow IDs (space-separated)
 */
export const WORKFLOW_AREA_START_REGEX =
  /^.*BEGIN (SORTED )?WORKFLOW AREA (.*) FOR (.*)$/;

/**
 * Regex pattern to match the end of a workflow area.
 * Matches: "END WORKFLOW AREA" (with any prefix/suffix for comments)
 */
export const WORKFLOW_AREA_END_REGEX = /^.*END WORKFLOW AREA.*$/;

/**
 * Checks if a line is the start of a workflow area.
 * @returns Object with area info if it's a start line, null otherwise
 */
export function parseWorkflowAreaStart(line: string): {
  areaName: string;
  workflowIds: string[];
  isSorted: boolean;
  fullLine: string;
} | null {
  const matches = WORKFLOW_AREA_START_REGEX.exec(line);
  if (!matches) {
    return null;
  }
  const [, sortedMarker, areaName, workflowIdsStr] = matches;
  return {
    areaName,
    workflowIds: workflowIdsStr.split(" ").filter(Boolean),
    isSorted: sortedMarker !== undefined,
    fullLine: line,
  };
}

/**
 * Checks if a line is the end of a workflow area.
 */
export function isWorkflowAreaEnd(line: string): boolean {
  return WORKFLOW_AREA_END_REGEX.test(line);
}

interface WorkflowAreaState {
  areaName: string;
  areaStartLine: string;
  areaEndLine: string;
  workflowAreaLines: string[];
  isSorted: boolean;
  appliesToWorkflow: boolean;
}

/**
 * Finds the start and end indices of a workflow area in the target file.
 * @returns Object with start and end indices, or null if not found
 */
function findTargetAreaIndices(
  result: string[],
  areaStartLine: string,
  areaEndLine: string,
  areaName: string,
  targetPath: string,
): { start: number; end: number } | null {
  const targetAreaStart = result.findIndex((line) => line === areaStartLine);

  if (targetAreaStart === -1) {
    console.warn(`Could not find target area ${areaName} in ${targetPath}`);
    return null;
  }

  // Find the END marker in the target file (after the BEGIN marker)
  const targetAreaEnd = result.findIndex(
    (line, index) => index > targetAreaStart && line === areaEndLine,
  );

  if (targetAreaEnd === -1) {
    console.warn(`Target area ${areaName} does not end in ${targetPath}`);
    return null;
  }

  return { start: targetAreaStart, end: targetAreaEnd };
}

/**
 * Checks if a sequence of lines exists consecutively in the target area.
 * @returns true if the entire sequence exists in order and uninterrupted
 */
function sequenceExists(sequence: string[], target: string[]): boolean {
  if (sequence.length === 0) {
    return true;
  }
  if (sequence.length > target.length) {
    return false;
  }

  // Try to find the sequence starting at each position in the target
  for (let i = 0; i <= target.length - sequence.length; i++) {
    let matches = true;
    for (let j = 0; j < sequence.length; j++) {
      if (target[i + j] !== sequence[j]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return true;
    }
  }

  return false;
}

/**
 * Gets new lines for non-sorted areas. If the entire sequence of transformed lines
 * already exists consecutively in the target, returns empty array. Otherwise, returns all transformed lines.
 */
function getNewLinesForNonSorted(
  workflowAreaLines: string[],
  existingAreaContent: string[],
  lineReplace: (line: string) => string,
): string[] {
  const transformedLines = workflowAreaLines.map(lineReplace);

  // Check if the entire sequence exists consecutively in the target
  if (sequenceExists(transformedLines, existingAreaContent)) {
    return [];
  }

  // If the sequence doesn't exist, return all transformed lines
  return transformedLines;
}

/**
 * Gets new lines for sorted areas. Deduplicates individual lines that already exist.
 */
function getNewLinesForSorted(
  workflowAreaLines: string[],
  existingAreaContent: string[],
  lineReplace: (line: string) => string,
): string[] {
  const transformedLines = workflowAreaLines.map(lineReplace);
  const seen = new Set<string>(existingAreaContent);
  const newLines: string[] = [];

  for (const line of transformedLines) {
    if (!seen.has(line)) {
      seen.add(line);
      newLines.push(line);
    }
  }

  return newLines;
}

/**
 * Updates a sorted workflow area by filtering whitespace, adding new lines, and sorting.
 */
function updateSortedArea(
  result: string[],
  targetAreaStart: number,
  targetAreaEnd: number,
  newLines: string[],
): void {
  // Get all existing content in the target area
  const areaContent = result.slice(targetAreaStart + 1, targetAreaEnd);

  // Filter out empty strings and whitespace-only lines from existing content
  const filteredContent = areaContent.filter((line) => line.trim().length > 0);

  // Add new lines if any, also filtering out whitespace-only lines
  if (newLines.length > 0) {
    const filteredNewLines = newLines.filter((line) => line.trim().length > 0);
    filteredContent.push(...filteredNewLines);
  }

  // Sort alphabetically
  filteredContent.sort();

  // Replace the area content with sorted, filtered content
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
    // Insert new lines right before the END marker
    result.splice(targetAreaEnd, 0, ...newLines);
  }
}

/**
 * Processes a workflow area and updates the target file.
 */
function processWorkflowArea(
  result: string[],
  state: WorkflowAreaState,
  targetPath: string,
  lineReplace: (line: string) => string,
): void {
  if (!state.appliesToWorkflow) {
    return;
  }

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

  // Get existing content in the target area (between BEGIN and END)
  const existingAreaContent = result.slice(targetAreaStart + 1, targetAreaEnd);

  // Get new lines based on whether it's sorted or not
  let newLines: string[];
  if (state.isSorted) {
    // For sorted areas, deduplicate individual lines
    newLines = getNewLinesForSorted(
      state.workflowAreaLines,
      existingAreaContent,
      lineReplace,
    );
  } else {
    // For non-sorted areas, check if entire sequence exists consecutively
    newLines = getNewLinesForNonSorted(
      state.workflowAreaLines,
      existingAreaContent,
      lineReplace,
    );
  }

  // Update the area based on whether it's sorted or not
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
}: WorkflowAreaParam): string[] {
  // Create a copy to avoid mutating the input
  const result = [...targetLines];

  let state: WorkflowAreaState | null = null;

  for (const sourceLine of sourceLines) {
    // Check if this is the start of a workflow area
    const areaStart = parseWorkflowAreaStart(sourceLine);
    if (areaStart) {
      state = {
        areaName: areaStart.areaName,
        areaStartLine: areaStart.fullLine,
        areaEndLine: "",
        workflowAreaLines: [],
        isSorted: areaStart.isSorted,
        appliesToWorkflow: areaStart.workflowIds.includes(workflowId),
      };
      continue;
    }

    // If we're not in a workflow area, skip this line
    if (!state) {
      continue;
    }

    // Check if this is the end of the workflow area
    if (isWorkflowAreaEnd(sourceLine)) {
      state.areaEndLine = sourceLine;
      processWorkflowArea(result, state, targetPath, lineReplace);
      state = null;
      continue;
    }

    // This is a content line inside the area, collect it
    state.workflowAreaLines.push(sourceLine);
  }

  return result;
}
