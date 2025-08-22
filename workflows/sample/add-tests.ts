import { existsSync } from "fs";
import { basename } from "path";

import { getPackageName, SimpleWorkflow } from "@saflib/workflows";

export interface AddTestsWorkflowParams {
  path: string;
}

interface AddTestsWorkflowData {}

export class AddTestsWorkflow extends SimpleWorkflow<
  AddTestsWorkflowParams,
  AddTestsWorkflowData
> {
  name = "add-tests";
  description = "Given a file, add tests to the file.";
  cliArguments = [
    {
      name: "path",
      description: "The path to the file to add tests to",
    },
  ];
  packageName = getPackageName(import.meta.url);
  init = async (path: string) => {
    this.params = { path };
    if (!existsSync(this.getParams().path)) {
      throw new Error(`File does not exist: ${this.getParams().path}`);
    }
    return { data: {} };
  };

  workflowPrompt = () => `You are adding tests to ${this.getParams().path}.`;

  getFilenameToTest() {
    return basename(this.getParams().path);
  }

  steps = [
    {
      name: "Get Oriented",
      prompt: () =>
        `First, run the existing tests for the package that ${this.getFilenameToTest()} is in. You should be able to run "npm run test". Run the tests for that package and make sure they are passing.`,
    },
    {
      name: "Add Tests",
      prompt: () =>
        `Now, add tests to ${this.getFilenameToTest()}. Create the test file next to the file you are testing.`,
    },
    {
      name: "Run Tests",
      prompt: () =>
        `Now, run the tests to make sure they are working. Fix any issues.`,
    },
  ];
}
