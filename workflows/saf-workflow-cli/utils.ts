import type { WorkflowOutput } from "../core/types.ts";
import type { ConcreteWorkflowRunner } from "./workflow.ts";

/**
 * Convenience function to take a ConcretWorkflowRunner, dry run it, and return the output. The output in particular includes the checklist.
 */
export const dryRunWorkflow = async (
  Workflow: ConcreteWorkflowRunner,
): Promise<WorkflowOutput> => {
  const workflow = new Workflow();
  const cliArguments = workflow.cliArguments;
  const exampleArgs = cliArguments.map(
    (arg) => arg.exampleValue || "example-value-missing",
  );
  const result = await workflow.init({ dryRun: true }, ...exampleArgs);
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  await workflow.kickoff();
  let lastStateName = workflow.getCurrentStateName();

  while (!workflow.done()) {
    await workflow.goToNextStep();
    const error = workflow.getError();
    if (error) {
      console.error("Workflow errored", error);
      process.exit(1);
    }
    const currentStateName = workflow.getCurrentStateName();
    if (currentStateName === lastStateName) {
      throw new Error(
        `Workflow ${workflow.name} is stuck on state ${currentStateName}.`,
      );
    }
    lastStateName = currentStateName;
  }

  return workflow.getOutput();
};
