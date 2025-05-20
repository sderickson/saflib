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
  path: string; // kebab-case, e.g. "get-by-id"
}

interface AddQueriesWorkflowContext extends WorkflowContext {
  name: string; // e.g. "get-by-id"
  camelName: string; // e.g. getById
  targetDir: string; // e.g. "/<abs-path>/queries/contacts/"
  sourceDir: string; // e.g. "/<abs-path>/query-template/"
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
    const targetDir = path.dirname(path.join(process.cwd(), input.path));
    const refDoc = path.resolve(__dirname, "../docs/03-queries.md");
    const testingGuide = path.resolve(
      __dirname,
      "../../drizzle-sqlite3-dev/docs/01-testing-guide.md",
    );
    return {
      name: path.basename(input.path).split(".")[0],
      camelName: toCamelCase(path.basename(input.path).split(".")[0]),
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

                Also, read the guidelines for queries in the doc: ${context.refDoc} and ${console.log(context)}`,
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
          for (const file of files) {
            if (!file.includes("query-template")) {
              continue;
            }
            const oldPath = path.join(targetDir, file);
            const newPath = path.join(
              targetDir,
              file.replace("query-template", name),
            );
            await rename(oldPath, newPath);
            const content = await readFile(newPath, "utf-8");
            const updatedContent = content
              .replace(/queryTemplate/g, camelName)
              .replace(/query-template/g, name)
              .replace(/QueryTemplate/g, camelName);
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
                `For the ${context.camelName} query, add types to the main "types.ts" file. As much as possible, these should be based on the types that drizzle provides. For example, if when creating a row, the database handles the id, createdAt, and updatedAt fields, have a "InsertTableRowParams" type that Omits those fields.

                Note: Do NOT create a new types.ts file. Add your types to the existing one next to the "package.json" file.`,
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
                `Add any necessary error types to the main "errors.ts" file for the ${context.camelName} query. Make sure to:
                1. Use simple extensions of MainDatabaseError (no custom implementation)
                2. Do NOT create a new errors.ts file
                3. Add your errors to the existing one (beside the "package.json" file)`,
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
                1. Export a queryWrapper'd function directly (no factory function)
                2. Take a DbKey as the first parameter
                3. Use mainDbManager.get(dbKey)! to get the db instance
                4. Use ReturnsError from @saflib/monorepo
                5. Use the types you just added to types.ts
                6. Don't use try/catch blocks
                7. Export the query from the folder's "index.ts" file`,
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
                `Read the testing guide: ${context.testingGuide} and update the generated ${context.name}.test.ts file accordingly.`,
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
      name: "path",
      description: "Path of the new query (e.g. 'queries/contacts/get-by-id')",
    },
  ];
}
