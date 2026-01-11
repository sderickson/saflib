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

export function updateWorkflowAreas({
  targetLines,
  targetPath,
  sourceLines,
  workflowId,
  lineReplace,
}: WorkflowAreaParam): string[] {
  // Create a copy to avoid mutating the input
  const result = [...targetLines];

  let inWorkflowArea = false;
  let areaAppliesToWorkflow = false;
  let workflowAreaLines: string[] = [];
  let isSortedArea = false;

  // target and source areas should share the same start and end lines - find and use them here
  let areaName = "";
  let areaStartLine = "";
  let areaEndLine = "";

  const resetVariables = () => {
    inWorkflowArea = false;
    areaAppliesToWorkflow = false;
    workflowAreaLines = [];
    areaStartLine = "";
    areaEndLine = "";
    isSortedArea = false;
  };
  console.log("checking file", targetPath);

  for (let sourceLine of sourceLines) {
    // find any template workflow areas in the source file
    // Support both "BEGIN WORKFLOW AREA" and "BEGIN SORTED WORKFLOW AREA"
    const areaStart = parseWorkflowAreaStart(sourceLine);
    if (areaStart) {
      areaName = areaStart.areaName;
      areaStartLine = areaStart.fullLine;
      areaAppliesToWorkflow = areaStart.workflowIds.includes(workflowId);
      isSortedArea = areaStart.isSorted;
      inWorkflowArea = true;
      workflowAreaLines = [];
      continue;
    }

    // Collect content lines while inside a workflow area
    if (inWorkflowArea) {
      console.log("inWorkflowArea", sourceLine);
      // Check if this is the end of the workflow area
      if (isWorkflowAreaEnd(sourceLine)) {
        inWorkflowArea = false;
        areaEndLine = sourceLine;

        if (areaAppliesToWorkflow) {
          console.log("areaAppliesToWorkflow", areaAppliesToWorkflow);
          // Find the matching target area by looking for the BEGIN marker
          const targetAreaStart = result.findIndex(
            (line) => line === areaStartLine,
          );

          if (targetAreaStart === -1) {
            console.warn(
              `Could not find target area ${areaName} in ${targetPath}`,
            );
            resetVariables();
            continue;
          }

          // Find the END marker in the target file (after the BEGIN marker)
          let targetAreaEnd = -1;
          for (let i = targetAreaStart + 1; i < result.length; i++) {
            if (result[i] === areaEndLine) {
              targetAreaEnd = i;
              break;
            }
          }

          if (targetAreaEnd === -1) {
            console.warn(
              `Target area ${areaName} does not end in ${targetPath}`,
            );
            resetVariables();
            continue;
          }

          // Transform the source content
          const transformedLines = workflowAreaLines.map((line) =>
            lineReplace(line),
          );

          // Get existing content in the target area (between BEGIN and END)
          const existingAreaContent = result.slice(
            targetAreaStart + 1,
            targetAreaEnd,
          );

          // Check if transformed lines already exist in the area
          // Compare each transformed line to see if it's already present
          const newLines: string[] = [];
          for (const transformedLine of transformedLines) {
            if (!existingAreaContent.includes(transformedLine)) {
              newLines.push(transformedLine);
            }
          }

          // If this is a sorted area, we need to sort and filter even if there are no new lines
          if (isSortedArea) {
            // Get all existing content in the target area
            const areaContent = result.slice(
              targetAreaStart + 1,
              targetAreaEnd,
            );

            // Filter out empty strings and whitespace-only lines from existing content
            const filteredContent = areaContent.filter(
              (line) => line.trim().length > 0,
            );

            // Add new lines if any, also filtering out whitespace-only lines
            if (newLines.length > 0) {
              const filteredNewLines = newLines.filter(
                (line) => line.trim().length > 0,
              );
              filteredContent.push(...filteredNewLines);
            }

            // Sort alphabetically
            filteredContent.sort();

            // Replace the area content with sorted, filtered content
            result.splice(
              targetAreaStart + 1,
              areaContent.length,
              ...filteredContent,
            );
          } else if (newLines.length > 0) {
            // For non-sorted areas, just insert new lines right before the END marker
            result.splice(targetAreaEnd, 0, ...newLines);
          }
        }

        // Reset for next area
        resetVariables();
      } else {
        // This is a content line inside the area, collect it
        workflowAreaLines.push(sourceLine);
      }
    }
  }

  return result;
}
