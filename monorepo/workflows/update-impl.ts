import { fromPromise, raise, setup } from "xstate";
import {
  workflowActionImplementations,
  workflowActors,
  logInfo,
  type WorkflowContext,
  logError,
  promptAgent,
  XStateWorkflow,
} from "@saflib/workflows";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";

const execAsync = promisify(exec);

interface UpdateImplWorkflowInput {
  targetFile: string; // Path to the implementation file to update
  specPath: string; // Path to the spec file
}

interface UpdateImplWorkflowContext extends WorkflowContext {
  targetFile: string;
  testFile: string;
  specPath: string;
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
  actions: workflowActionImplementations,
  actors: workflowActors,
}).createMachine({
  id: "update-impl",
  description: "Update an implementation and its test based on a project spec.",
  initial: "reviewSpec",
  context: ({ input }) => {
    const testFile = findTestFile(input.targetFile);
    const packageDir = findPackageDir(input.targetFile);
    return {
      targetFile: input.targetFile,
      testFile,
      specPath: input.specPath,
      packageDir,
      loggedLast: false,
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
                `Review the project spec at ${context.specPath} and the implementation file at ${context.targetFile}. If you need clarification on what needs to change, ask now. Otherwise, confirm you understand the required changes.`,
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
                `Update the implementation in ${context.targetFile} according to the project spec at ${context.specPath}. Make all necessary changes. If you need help, ask for clarification.`,
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
                `Update the test file at ${context.testFile} to test the new or updated functionality in ${context.targetFile}. Make sure the tests cover the new interface or function signature.`,
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
        src: fromPromise(async ({ input }) => {
          const { testFile, packageDir } = input;
          const relTestFile = path.relative(packageDir, testFile);
          const { stdout, stderr } = await execAsync(
            `npm run test ${relTestFile}`,
            { cwd: packageDir },
          );
          if (stderr && !stdout.includes("Test Suites: 0 failed")) {
            throw new Error(stderr);
          }
          return stdout;
        }),
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
        src: fromPromise(async ({ input }) => {
          const { packageDir } = input;
          const { stdout, stderr } = await execAsync(`npm run test`, {
            cwd: packageDir,
          });
          if (stderr && !stdout.includes("Test Suites: 0 failed")) {
            throw new Error(stderr);
          }
          return stdout;
        }),
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
            ({ context }) =>
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
      name: "targetFile",
      description: "Path to the implementation file to update",
    },
    {
      name: "specPath",
      description: "Path to the spec file",
    },
  ];
}
