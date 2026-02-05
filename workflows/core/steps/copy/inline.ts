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

interface WorkflowAreaInfo {
  areaName: string;
  workflowIds: string[];
  isSorted: boolean;
  startLine: string;
  endLine: string | null;
}

/**
 * Extracts all workflow areas from a set of lines.
 * @returns Array of workflow area information, including whether each has a matching END marker
 */
function extractWorkflowAreas(lines: string[]): WorkflowAreaInfo[] {
  const areas: WorkflowAreaInfo[] = [];
  let currentArea: {
    areaName: string;
    workflowIds: string[];
    isSorted: boolean;
    startLine: string;
    startIndex: number;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this is the start of a workflow area
    const areaStart = parseWorkflowAreaStart(line);
    if (areaStart) {
      // If we have an unclosed area, record it as missing END
      if (currentArea) {
        areas.push({
          areaName: currentArea.areaName,
          workflowIds: currentArea.workflowIds,
          isSorted: currentArea.isSorted,
          startLine: currentArea.startLine,
          endLine: null,
        });
      }

      currentArea = {
        areaName: areaStart.areaName,
        workflowIds: areaStart.workflowIds,
        isSorted: areaStart.isSorted,
        startLine: areaStart.fullLine,
        startIndex: i,
      };
      continue;
    }

    // If we're in an area, check for END marker
    if (currentArea && isWorkflowAreaEnd(line)) {
      areas.push({
        areaName: currentArea.areaName,
        workflowIds: currentArea.workflowIds,
        isSorted: currentArea.isSorted,
        startLine: currentArea.startLine,
        endLine: line,
      });
      currentArea = null;
    }
  }

  // If there's an unclosed area at the end, record it
  if (currentArea) {
    areas.push({
      areaName: currentArea.areaName,
      workflowIds: currentArea.workflowIds,
      isSorted: currentArea.isSorted,
      startLine: currentArea.startLine,
      endLine: null,
    });
  }

  return areas;
}

/**
 * Creates a unique key for a workflow area based on its properties.
 * Normalizes workflow ID order but preserves comment style for exact matching.
 */
function getAreaKey(area: WorkflowAreaInfo): string {
  // Parse the start line to extract comment prefix
  const parsed = parseWorkflowAreaStart(area.startLine);
  if (!parsed) {
    // Fallback: use full line if parsing fails
    return area.startLine;
  }

  // Extract comment prefix (everything before "BEGIN")
  const beginIndex = area.startLine.indexOf("BEGIN");
  const prefix = beginIndex >= 0 ? area.startLine.substring(0, beginIndex) : "";
  
  // Normalize workflow IDs by sorting them
  const normalizedIds = [...area.workflowIds].sort().join(" ");
  
  // Build normalized key: prefix + normalized area definition
  // This preserves comment style but normalizes workflow ID order
  const sortedMarker = area.isSorted ? "SORTED " : "";
  const normalizedDefinition = `BEGIN ${sortedMarker}WORKFLOW AREA ${area.areaName} FOR ${normalizedIds}`;
  
  return `${prefix}${normalizedDefinition}`;
}

/**
 * Validates that source and target files have matching workflow areas.
 * Throws an error if there are any inconsistencies:
 * - Source has a workflow area that target doesn't have, or vice versa
 * - Areas differ in any way (sorted or not, different workflow IDs, different area names)
 * - Either has a workflow area without a matching END marker
 */
export function validateWorkflowAreas({
  sourceLines,
  targetLines,
  targetPath,
  sourcePath,
}: {
  sourceLines: string[];
  targetLines: string[];
  targetPath: string;
  sourcePath: string;
}): void {
  const sourceAreas = extractWorkflowAreas(sourceLines);
  const targetAreas = extractWorkflowAreas(targetLines);
  const errorContext = `
  Source: ${sourcePath}
  Target: ${targetPath}
  `;

  // Check for areas missing END markers
  for (const area of sourceAreas) {
    if (area.endLine === null) {
      throw new Error(
        `Source has workflow area "${area.areaName}" without matching END marker${errorContext}`,
      );
    }
  }

  for (const area of targetAreas) {
    if (area.endLine === null) {
      throw new Error(
        `Target has workflow area "${area.areaName}" without matching END marker${errorContext}`,
      );
    }
  }

  // Create maps keyed by area properties for comparison
  const sourceAreaMap = new Map<string, WorkflowAreaInfo>();
  const targetAreaMap = new Map<string, WorkflowAreaInfo>();

  for (const area of sourceAreas) {
    const key = getAreaKey(area);
    if (sourceAreaMap.has(key)) {
      throw new Error(
        `Source has duplicate workflow area "${area.areaName}"${errorContext}`,
      );
    }
    sourceAreaMap.set(key, area);
  }

  for (const area of targetAreas) {
    const key = getAreaKey(area);
    if (targetAreaMap.has(key)) {
      throw new Error(
        `Target has duplicate workflow area "${area.areaName}"${errorContext}`,
      );
    }
    targetAreaMap.set(key, area);
  }

  // Check for areas in source but not in target
  for (const [key, area] of sourceAreaMap) {
    if (!targetAreaMap.has(key)) {
      throw new Error(
        `Source has workflow area "${area.areaName}" (${area.isSorted ? "SORTED " : ""}FOR ${area.workflowIds.join(" ")}) that target does not have${errorContext}`,
      );
    }
  }

  // Check for areas in target but not in source
  for (const [key, area] of targetAreaMap) {
    if (!sourceAreaMap.has(key)) {
      throw new Error(
        `Target has workflow area "${area.areaName}" (${area.isSorted ? "SORTED " : ""}FOR ${area.workflowIds.join(" ")}) that source does not have${errorContext}`,
      );
    }
  }

  // Verify exact matches (area name, sorted status, workflow IDs)
  for (const [key, sourceArea] of sourceAreaMap) {
    const targetArea = targetAreaMap.get(key)!;

    // These should already match due to the key, but double-check for safety
    if (sourceArea.areaName !== targetArea.areaName) {
      throw new Error(
        `Workflow area name mismatch: source has "${sourceArea.areaName}" but target has "${targetArea.areaName}"${errorContext}`,
      );
    }

    if (sourceArea.isSorted !== targetArea.isSorted) {
      throw new Error(
        `Workflow area "${sourceArea.areaName}" sorted status mismatch: source is ${sourceArea.isSorted ? "SORTED" : "not sorted"} but target is ${targetArea.isSorted ? "SORTED" : "not sorted"}${errorContext}`,
      );
    }

    const sourceIds = [...sourceArea.workflowIds].sort();
    const targetIds = [...targetArea.workflowIds].sort();
    if (
      sourceIds.length !== targetIds.length ||
      sourceIds.some((id, i) => id !== targetIds[i])
    ) {
      throw new Error(
        `Workflow area "${sourceArea.areaName}" workflow IDs mismatch: source has [${sourceIds.join(", ")}] but target has [${targetIds.join(", ")}]${errorContext}`,
      );
    }
  }
}
