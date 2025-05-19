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
import { readdir, rename, readFile, writeFile } from "node:fs/promises";

const execAsync = promisify(exec);

interface AddQueriesWorkflowInput {
  name: string; // kebab-case, e.g. "get-by-id"
}

interface AddQueriesWorkflowContext extends WorkflowContext {
  name: string; // kebab-case
  camelName: string; // camelCase, e.g. getById
  targetDir: string;
  sourceDir: string;
  refDoc: string;
  testingGuide: string;
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

export const AddQueriesWorkflowMachine = setup({
  types: {
    input: {} as AddQueriesWorkflowInput,
    context: {} as AddQueriesWorkflowContext,
  },
  actions: workflowActionImplementations,
  actors: workflowActors,
}).createMachine({
  id: "add-queries",
  description:
    "Add a new query to a database built off the drizzle-sqlite3 package.",
  initial: "getOriented",
  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceDir = path.join(__dirname, "query-template");
    const targetDir = path.join(process.cwd(), "queries");
    const refDoc = path.resolve(__dirname, "../docs/03-queries.md");
    const testingGuide = path.resolve(
      __dirname,
      "../../drizzle-sqlite3-dev/docs/01-testing-guide.md",
    );
    return {
      name: input.name,
      camelName: toCamelCase(input.name),
      targetDir,
      sourceDir,
      refDoc,
      testingGuide,
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
                `Read the project spec and the reference documentation for the @saflib/drizzle-sqlite3 package. If they haven't already, ask the user for the project spec.

                Also, read the guidelines for queries in the doc: ${context.refDoc}`,
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
          const { targetDir, sourceDir } = input;
          await execAsync(`mkdir -p "${targetDir}"`);
          const { stdout, stderr } = await execAsync(
            `cp -r "${sourceDir}/"* "${targetDir}"`,
          );
          if (stderr) {
            throw new Error(`Failed to copy template: ${stderr}`);
          }
          return stdout;
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
              "Failed to copy the template files. Please check if the source directory exists and you have the necessary permissions.",
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
          const { targetDir, camelName, name } = input;

          // Get all files in the directory
          const files = await readdir(targetDir);

          // Rename files and update their contents
          for (const file of files) {
            const oldPath = path.join(targetDir, file);
            let newPath = oldPath;

            // Rename files containing query-template
            if (file.includes("query-template")) {
              newPath = path.join(
                targetDir,
                file.replace("query-template", name),
              );
              await rename(oldPath, newPath);
            }

            // Update file contents
            const content = await readFile(newPath, "utf-8");
            const updatedContent = content
              .replace(/queryTemplate/g, camelName)
              .replace(/query-template/g, name);
            await writeFile(newPath, updatedContent);
          }

          return "Renamed placeholders";
        }),
        onDone: {
          target: "addTypes",
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
    addTypes: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `For the ${context.camelName} query, add types for the parameters and return values to the main "types.ts" file. As much as possible, these should be based on the types that drizzle provides. For example, if when creating a row, the database handles the id, createdAt, and updatedAt fields, have a "InsertTableRowParams" type that Omits those fields.`,
            ),
          ],
        },
        continue: {
          target: "addErrors",
        },
      },
    },
    addErrors: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Add any necessary error types to the "errors.ts" file for the ${context.camelName} query. Make sure to use specific error types rather than generic ones.`,
            ),
          ],
        },
        continue: {
          target: "implementQuery",
        },
      },
    },
    implementQuery: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Implement the ${context.camelName} query. Make sure to:
                1. Use queryWrapper from errors.ts
                2. Use ReturnsError from @saflib/monorepo
                3. Use the types you just created
                4. Don't use try/catch blocks
                5. Export the query from the folder's "index.ts" file`,
            ),
          ],
        },
        continue: {
          target: "reviewDocs",
        },
      },
    },
    reviewDocs: {
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
          target: "runTests",
        },
      },
    },
    runTests: {
      invoke: {
        src: fromPromise(doTestsPass),
        onDone: {
          target: "done",
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
    done: {
      type: "final",
    },
  },
});

export class AddQueriesWorkflow extends XStateWorkflow {
  machine = AddQueriesWorkflowMachine;
  description =
    "Add a new query to a database built off the drizzle-sqlite3 package.";
  cliArguments = [
    {
      name: "name",
      description: "Name of the new query in kebab-case (e.g. 'get-by-id')",
    },
  ];
}
