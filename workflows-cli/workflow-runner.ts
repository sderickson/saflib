#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { execSync } from "node:child_process";

const endString = "--- This workflow has been completed. ---";
const todoString = "it still contains TODO strings"

export const runWorkflow = (workflow: string) => {
  execSync(`npm exec saf-workflow kickoff ${workflow} -- --skip-todos`, {
    stdio: "inherit",
  });
  while (true) {
    const output = execSync(`npm exec saf-workflow next`).toString();
    console.log(output);
    if (output.includes(endString) || output.includes(todoString)) {
      break;
    }
  }
};

runWorkflow("./test-all-workflows.ts");