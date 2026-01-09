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
}: WorkflowAreaParam) {
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

    // find the end of the workflow area
    if (inWorkflowArea && /^.*END WORKFLOW AREA.*$/.test(sourceLine)) {
      inWorkflowArea = false;
      areaEndLine = sourceLine;
      if (areaAppliesToWorkflow) {
        // find the same target area in targetLines
        let foundTargetArea = false;
        const targetAreaStart = workflowAreaLines.findIndex(
          (line) => line === sourceLine,
        );
        if (targetAreaStart === -1) {
          console.warn(
            `Could not find target area ${areaName} in ${targetPath}`,
          );
          resetVariables();
          continue;
        }

        let targetAreaEnd = 0;
        for (let i = targetAreaStart + 1; i < targetLines.length; i++) {
          if (targetLines[i] === sourceLine) {
            foundTargetArea = true;
            targetAreaEnd = i;
            break;
          }
        }
        if (!foundTargetArea) {
          console.warn(`Target area ${areaName} does not end in ${targetPath}`);
          resetVariables();
          continue;
        }

        // transform text and insert into target lines
        if (foundTargetArea) {
          const transformedLines = workflowAreaLines.map((line) =>
            lineReplace(line),
          );
          targetLines.splice(targetAreaEnd, 0, ...transformedLines);
        }
      }

      // successs - reset for next area
      resetVariables();
    }
  }
}
