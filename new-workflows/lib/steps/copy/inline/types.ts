export interface WorkflowAreaParam {
  targetPath: string;
  targetLines: string[];
  sourceLines: string[];
  workflowId: string;
  lineReplace: (line: string) => string;
  /**
   * Optional flags for conditional areas (e.g. IF upload).
   * When an area has "IF <flag>", the chosen branch is determined by flags[flag].
   */
  flags?: Record<string, boolean>;
}

export interface WorkflowAreaStartParsed {
  areaName: string;
  workflowIds: string[];
  isSorted: boolean;
  isOnce: boolean;
  ifFlag: string | undefined;
  fullLine: string;
}

export interface WorkflowAreaState {
  areaName: string;
  areaStartLine: string;
  areaEndLine: string;
  workflowAreaLines: string[];
  isSorted: boolean;
  appliesToWorkflow: boolean;
  isOnce: boolean;
  ifFlag: string | undefined;
  /** Lines before ELSE (if any). */
  ifBlockLines: string[];
  /** Lines after ELSE (if any). Empty if no ELSE. */
  elseBlockLines: string[];
}

export interface WorkflowAreaInfo {
  areaName: string;
  workflowIds: string[];
  isSorted: boolean;
  isOnce: boolean;
  ifFlag: string | undefined;
  startLine: string;
  endLine: string | null;
}
