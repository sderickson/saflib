export interface WorkflowAreaParam {
  targetPath: string;
  targetLines: string[];
  sourceLines: string[];
  workflowId: string;
  lineReplace: (line: string) => string;
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

  for (let sourceLine of sourceLines) {
    // find any template workflow areas in the source file
    // Support both "BEGIN WORKFLOW AREA" and "BEGIN SORTED WORKFLOW AREA"
    const matches = /^.*BEGIN (SORTED )?WORKFLOW AREA (.*) FOR (.*)$/.exec(
      sourceLine,
    );
    if (matches) {
      const [, sortedMarker, _areaName, workflowIds] = matches;
      areaName = _areaName;
      areaStartLine = sourceLine;
      areaAppliesToWorkflow = workflowIds.split(" ").includes(workflowId);
      isSortedArea = sortedMarker !== undefined;
      inWorkflowArea = true;
      workflowAreaLines = [];
      continue;
    }

    // Collect content lines while inside a workflow area
    if (inWorkflowArea) {
      // Check if this is the end of the workflow area
      if (/^.*END WORKFLOW AREA.*$/.test(sourceLine)) {
        inWorkflowArea = false;
        areaEndLine = sourceLine;

        if (areaAppliesToWorkflow) {
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

          // Only insert if there are new lines to add
          if (newLines.length > 0) {
            // Insert new lines right before the END marker (append to existing content)
            result.splice(targetAreaEnd, 0, ...newLines);

            // If this is a sorted area, sort all lines in the area alphabetically
            if (isSortedArea) {
              // After insertion, the END marker is now at targetAreaEnd + newLines.length
              const newTargetAreaEnd = targetAreaEnd + newLines.length;

              // Extract all content between BEGIN and END (now includes new lines)
              const areaContent = result.slice(
                targetAreaStart + 1,
                newTargetAreaEnd,
              );

              // Sort alphabetically
              areaContent.sort();

              // Replace the area content with sorted content
              result.splice(
                targetAreaStart + 1,
                areaContent.length,
                ...areaContent,
              );
            }
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
