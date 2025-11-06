#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { execSync } from "node:child_process";

const endString = "--- This workflow has been completed. ---";

export const runWorkflow = (workflow: string) => {
  execSync(`npm exec saf-workflow kickoff ${workflow} -- --skip-todos`, {
    stdio: "inherit",
  });
  let lastOutput = "";
  while (true) {
    const output = execSync(`npm exec saf-workflow next`).toString();
    console.log(output);
    if (output.includes(endString)) {
      console.log("Workflow has been completed.");
      break;
    }
    if (output === lastOutput) {
      console.log("Workflow appears stuck! Exiting.");
      process.exit(1);
      break;
    }
    lastOutput = output;
  }
};

runWorkflow("./test-all-workflows.ts");