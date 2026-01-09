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
  };

  for (let sourceLine of sourceLines) {
    // find any template workflow areas in the source file
    const matches = /^.*BEGIN WORKFLOW AREA (.*) FOR (.*)$/.exec(sourceLine);
    if (matches) {
      const [, _areaName, workflowIds] = matches;
      areaName = _areaName;
      areaStartLine = sourceLine;
      areaAppliesToWorkflow = workflowIds.split(" ").includes(workflowId);
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

          // Transform the source content and insert it between BEGIN and END
          const transformedLines = workflowAreaLines.map((line) =>
            lineReplace(line),
          );

          // Insert transformed lines right after the BEGIN marker
          result.splice(targetAreaStart + 1, 0, ...transformedLines);
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
