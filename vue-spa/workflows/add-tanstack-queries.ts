import { fromPromise, raise, setup } from "xstate";
import {
  workflowActionImplementations,
  workflowActors,
  logInfo,
  type WorkflowContext,
  logError,
  promptAgent,
  XStateWorkflow,
  doTestsPass,
} from "@saflib/workflows";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile } from "node:fs/promises";

const execAsync = promisify(exec);

interface AddTanstackQueriesWorkflowInput {
  path: string; // e.g. "requests/feature.ts"
}

interface AddTanstackQueriesWorkflowContext extends WorkflowContext {
  name: string; // e.g. "feature"
  camelName: string; // e.g. feature
  targetDir: string; // e.g. "/<abs-path>/requests/"
  targetFile: string; // e.g. "/<abs-path>/requests/feature.ts"
  targetTestFile: string; // e.g. "/<abs-path>/requests/feature.test.ts"
  sourceFile: string; // e.g. "/<abs-path>/workflows/query-template.ts"
  sourceTestFile: string; // e.g. "/<abs-path>/workflows/query-template.test.ts"
  refDoc: string;
  testingGuide: string;
  packageIndexPath: string; // e.g. "/<abs-path>/index.ts"
}

function toCamelCase(name: string) {
  return name
    .split("-")
    .map((part, index) => {
      if (index === 0) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

export const AddTanstackQueriesWorkflowMachine = setup({
  types: {
    input: {} as AddTanstackQueriesWorkflowInput,
    context: {} as AddTanstackQueriesWorkflowContext,
  },
  actions: workflowActionImplementations,
  actors: workflowActors,
}).createMachine({
  id: "add-tanstack-queries",
  description: "Add TanStack Query integration to a SAF-powered Vue SPA.",
  initial: "getOriented",
  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceFile = path.join(__dirname, "query-template.ts");
    const sourceTestFile = path.join(__dirname, "query-template.test.ts");
    const targetFile = path.join(process.cwd(), input.path);
    const targetTestFile = path.join(
      process.cwd(),
      input.path.replace(".ts", ".test.ts"),
    );
    const targetDir = path.dirname(targetFile);
    const name = path.basename(input.path, ".ts");
    const camelName = toCamelCase(name);
    const refDoc = path.resolve(__dirname, "../docs/03-adding-queries.md");
    const testingGuide = path.resolve(
      __dirname,
      "../../vue-spa-dev/docs/query-testing.md",
    );
    const packageIndexPath = path.join(targetDir, "index.ts");
    return {
      name,
      camelName,
      targetDir,
      targetFile,
      targetTestFile,
      sourceFile,
      sourceTestFile,
      refDoc,
      testingGuide,
      packageIndexPath,
      loggedLast: false,
    };
  },
  entry: logInfo("Successfully began workflow"),
  states: {
    getOriented: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Read the project spec and the reference documentation for TanStack Query integration.\n\nSee: ${context.refDoc}\n\nAlso, review the testing guide: ${context.testingGuide}`,
            ),
          ],
        },
        continue: {
          target: "copyTemplate",
        },
      },
    },
    copyTemplate: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => {
          const {
            targetDir,
            sourceFile,
            targetFile,
            sourceTestFile,
            targetTestFile,
          } = input;
          await execAsync(`mkdir -p "${targetDir}"`);

          // Copy main template
          const { stdout: mainStdout, stderr: mainStderr } = await execAsync(
            `cp "${sourceFile}" "${targetFile}"`,
          );
          if (mainStderr) {
            throw new Error(`Failed to copy main template: ${mainStderr}`);
          }

          // Copy test template
          const { stdout: testStdout, stderr: testStderr } = await execAsync(
            `cp "${sourceTestFile}" "${targetTestFile}"`,
          );
          if (testStderr) {
            throw new Error(`Failed to copy test template: ${testStderr}`);
          }

          return { mainStdout, testStdout };
        }),
        onDone: {
          target: "renamePlaceholders",
          actions: logInfo(
            ({ context }) => `Copied template files to ${context.targetDir}`,
          ),
        },
        onError: {
          actions: [
            logError(
              ({ event }) =>
                `Failed to copy template: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              "Failed to copy the template files. Please check if the source files exist and you have the necessary permissions.",
          ),
        },
        continue: {
          reenter: true,
          target: "copyTemplate",
        },
      },
    },
    renamePlaceholders: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => {
          const { targetFile, targetTestFile, camelName, name } = input;

          // Update main file
          const content = await readFile(targetFile, "utf-8");
          const updatedContent = content
            .replace(/queryTemplate/g, camelName)
            .replace(/query-template/g, name);
          await writeFile(targetFile, updatedContent);

          // Update test file
          const testContent = await readFile(targetTestFile, "utf-8");
          const updatedTestContent = testContent
            .replace(/queryTemplate/g, camelName)
            .replace(
              /useQueryTemplate/g,
              `use${camelName.charAt(0).toUpperCase() + camelName.slice(1)}`,
            );
          await writeFile(targetTestFile, updatedTestContent);

          return "Renamed placeholders";
        }),
        onDone: {
          target: "reviewTestDocs",
          actions: logInfo(
            () => `Renamed all placeholders in files and file names.`,
          ),
        },
        onError: {
          actions: [
            logError(
              ({ event }) =>
                `Failed to rename placeholders: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              "Failed to rename placeholders. Please check the file and directory permissions and naming conventions.",
          ),
        },
        continue: {
          reenter: true,
          target: "renamePlaceholders",
        },
      },
    },
    reviewTestDocs: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Read the testing guide: ${context.testingGuide}`,
            ),
          ],
        },
        continue: {
          target: "implementTests",
        },
      },
    },
    implementTests: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Update the generated ${context.name}.test.ts file to follow the testing guide. Make sure to:

                1. Use withVueQuery for setup
                2. Set up mock server with appropriate handlers
                3. Test both success and error cases
                4. Test cache invalidation if mutations are present by overriding the GET endpoint to return updated data and verifying that the query data matches the updated response
                5. Follow the patterns from the example tests
                6. Always unmount the app after tests
                7. Use proper typing for mock data and responses`,
            ),
          ],
        },
        continue: {
          target: "runTests",
        },
      },
    },
    runTests: {
      invoke: {
        src: fromPromise(doTestsPass),
        onDone: {
          target: "checkPackageIndex",
          actions: logInfo(() => `Tests passed successfully.`),
        },
        onError: {
          actions: [
            logError(
              ({ event }) => `Tests failed: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () => "Tests failed. Please fix the issues and continue.",
          ),
        },
        continue: {
          reenter: true,
          target: "runTests",
        },
      },
    },
    checkPackageIndex: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Update the package index.ts at ${context.packageIndexPath} to export the new queries file.\n\nFor example, add:\nexport * from './${context.name}.ts'` +
                `\n\nSee the docs for more: ${context.refDoc}`,
            ),
          ],
        },
        continue: {
          target: "done",
        },
      },
    },
    done: {
      type: "final",
    },
  },
});

export class AddTanstackQueriesWorkflow extends XStateWorkflow {
  machine = AddTanstackQueriesWorkflowMachine;
  description = "Add TanStack Query integration to a SAF-powered Vue SPA.";
  cliArguments = [
    {
      name: "path",
      description: "Path of the new queries file (e.g. 'requests/feature.ts')",
    },
  ];
}
