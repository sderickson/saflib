import { fromPromise, raise, setup } from "xstate";
import {
  workflowActions,
  workflowActors,
  logInfo,
  type WorkflowContext,
  logError,
  promptAgent,
  XStateWorkflow,
  doTestsPass,
  doesTestPass,
  contextFromInput,
  type WorkflowInput,
} from "@saflib/workflows";
import path from "node:path";
import { existsSync } from "node:fs";
import { cwd } from "node:process";

interface UpdateImplWorkflowInput extends WorkflowInput {
  path: string;
}

interface UpdateImplWorkflowContext extends WorkflowContext {
  targetFile: string;
  testFile: string;
  packageDir: string;
}

function findTestFile(targetFile: string) {
  const dir = path.dirname(targetFile);
  const base = path.basename(targetFile, ".ts");
  const testFile = path.join(dir, `${base}.test.ts`);
  return testFile;
}

function findPackageDir(targetFile: string) {
  // Find the nearest directory containing a package.json
  let dir = path.dirname(targetFile);
  while (dir !== "/" && !existsSync(path.join(dir, "package.json"))) {
    dir = path.dirname(dir);
  }
  return dir;
}

export const UpdateImplWorkflowMachine = setup({
  types: {
    input: {} as UpdateImplWorkflowInput,
    context: {} as UpdateImplWorkflowContext,
  },
  actions: workflowActions,
  actors: workflowActors,
}).createMachine({
  id: "update-impl",
  description: "Update an implementation and its test based on a project spec.",
  initial: "reviewSpec",
  context: ({ input }) => {
    const testFile = findTestFile(input.path);
    const packageDir = findPackageDir(input.path);
    if (packageDir !== ".") {
      throw new Error(
        `You should run this workflow from the package it's part of: ${packageDir}, not ${cwd()}`,
      );
    }
    return {
      targetFile: input.path,
      testFile,
      packageDir,
      ...contextFromInput(input),
    };
  },
  entry: logInfo("Successfully began workflow"),
  states: {
    reviewSpec: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Review the project spec (already given) and the implementation file at ${context.targetFile}. If you need clarification on what needs to change, ask now. Otherwise, confirm you understand the required changes.`,
            ),
          ],
        },
        continue: {
          target: "updateImplementation",
        },
      },
    },
    updateImplementation: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Update the implementation in ${context.targetFile} according to the project spec. Make all necessary changes. If you need help, ask for clarification.`,
            ),
          ],
        },
        continue: {
          target: "updateTestFile",
        },
      },
    },
    updateTestFile: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Update the test file at ${context.testFile} to test the new or updated functionality in ${context.targetFile}. If this is a small change, just modify an existing test to cover the new or updated functionality, rather than adding a whole new test. Make sure the tests cover the new interface or function signature.`,
            ),
          ],
        },
        continue: {
          target: "runSpecificTest",
        },
      },
    },
    runSpecificTest: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => doesTestPass(input.testFile)),
        onDone: {
          target: "runPackageTests",
          actions: logInfo(() => `Specific test passed successfully.`),
        },
        onError: {
          actions: [
            logError(
              ({ event }) =>
                `Specific test failed: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            ({ context }) =>
              `The specific test at ${context.testFile} failed. Please fix the issues and continue.`,
          ),
        },
        continue: {
          reenter: true,
          target: "runSpecificTest",
        },
      },
    },
    runPackageTests: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(doTestsPass),
        onDone: {
          target: "done",
          actions: logInfo(() => `All package tests passed successfully.`),
        },
        onError: {
          actions: [
            logError(
              ({ event }) =>
                `Package tests failed: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              `The package test suite failed. Please fix the issues and continue.`,
          ),
        },
        continue: {
          reenter: true,
          target: "runPackageTests",
        },
      },
    },
    done: {
      type: "final",
    },
  },
});

export class UpdateImplWorkflow extends XStateWorkflow {
  machine = UpdateImplWorkflowMachine;
  description =
    "Update an implementation and its test based on a project spec.";
  cliArguments = [
    {
      name: "path",
      description: "Path to the implementation file to update",
    },
  ];
  sourceUrl = import.meta.url;
}
