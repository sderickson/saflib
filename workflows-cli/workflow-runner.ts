#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { execSync } from "node:child_process";

export const runWorkflow = (workflow: string) => {
  execSync(`npm exec saf-workflow kickoff ${workflow}`, {
    stdio: "inherit",
  });
};

runWorkflow("./test-all-workflows.ts");