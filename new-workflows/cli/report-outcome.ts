import type { StepResult } from "@saflib/new-workflows";

/** Prints a one-line summary of where a run loop stopped. */
export function reportOutcome(outcome: StepResult): void {
  switch (outcome.status) {
    case "done":
      console.log("Workflow complete.");
      break;
    case "success":
      // The loop only returns here if it decided to stop early; shouldn't happen.
      console.log("Step succeeded.");
      break;
    case "awaiting_prompt":
      console.log(`\n--- Waiting on the agent. Run 'new-workflow next' when ready. ---`);
      break;
    case "awaiting_user":
      console.log(`\n--- ${outcome.message}\nRun 'new-workflow next' once done. ---`);
      break;
    case "error":
      console.error(`\n!!! Step failed: ${outcome.message}`);
      break;
  }
}
