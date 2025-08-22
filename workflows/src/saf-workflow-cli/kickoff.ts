import { saveWorkflow } from "../file-io.ts";
import { type WorkflowMeta } from "../workflow.ts";

export const kickoffWorkflow = async (
  workflowMeta: WorkflowMeta,
  args: string[],
) => {
  const { Workflow, cliArguments } = workflowMeta;
  const workflow = new Workflow();
  const result = await workflow.init(
    { dryRun: false },
    ...args.slice(0, cliArguments.length),
  );
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  await workflow.kickoff();
  saveWorkflow(workflow);
};
