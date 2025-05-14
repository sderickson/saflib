export type Result<C extends Record<string, any>> = {
  data?: C;
  error?: Error;
};

export interface Step {
  name: string;
  prompt: () => string;
}

export interface CLIArgument {
  name: string;
  description?: string;
  defaultValue?: string;
}

export type WorkflowStatus = "not started" | "in progress" | "completed";

export interface WorkflowBlobInternalState {
  status: WorkflowStatus;
  stepIndex: number;
  data: Record<string, any>;
  params: Record<string, any>;
}

export interface WorkflowBlob {
  workflowName: string;
  internalState: any;
}
