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

interface AddRouteWorkflowInput {
  path: string; // kebab-case, e.g. "routes/call-series/create-call-series.ts"
}

interface AddRouteWorkflowContext extends WorkflowContext {
  name: string; // e.g. "create-call-series"
  camelName: string; // e.g. createCallSeries
  targetDir: string; // e.g. "/<abs-path>/routes/call-series/"
  sourceDir: string; // e.g. "/<abs-path>/route-template/"
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

export const AddRouteWorkflowMachine = setup({
  types: {
    input: {} as AddRouteWorkflowInput,
    context: {} as AddRouteWorkflowContext,
  },
  actions: workflowActionImplementations,
  actors: workflowActors,
}).createMachine({
  id: "add-route",
  description: "Add a new route to an Express.js service.",
  initial: "getOriented",
  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceDir = path.join(__dirname, "route-template");
    const targetDir = path.dirname(path.join(process.cwd(), input.path));
    const refDoc = path.resolve(__dirname, "../docs/02-adding-routes.md");
    const testingGuide = path.resolve(
      __dirname,
      "../../node-express-dev/docs/01-test-routes.md",
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
                `Read the reference documentation for adding routes: ${context.refDoc}

                This workflow will help you add a new route handler for ${context.name}. The route will be created in ${context.targetDir}.`,
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
            if (!file.includes("route-template")) {
              continue;
            }
            const oldPath = path.join(targetDir, file);
            const newPath = path.join(
              targetDir,
              file.replace("route-template", name),
            );
            await rename(oldPath, newPath);
            const content = await readFile(newPath, "utf-8");
            const updatedContent = content
              .replace(/routeTemplate/g, camelName)
              .replace(/route-template/g, name)
              .replace(/RouteTemplate/g, camelName);
            await writeFile(newPath, updatedContent);
          }

          return "Renamed placeholders";
        }),
        onDone: {
          target: "implementRoute",
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
    implementRoute: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Implement the ${context.camelName} route handler. Make sure to:
                1. Use createHandler from @saflib/express
                2. Use types from your OpenAPI spec for request/response bodies
                3. Handle expected errors from service/DB layers
                4. Let unexpected errors propagate to central error handler
                5. Follow the pattern in the reference doc
                6. Export the handler from the folder's "index.ts" file`,
            ),
          ],
        },
        continue: {
          target: "reviewTestDocs",
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
                `Read the testing guide: ${context.testingGuide}

                Update the generated ${context.name}.test.ts file to follow these guidelines:
                1. Use supertest for making requests
                2. Test against the actual app with middleware
                3. Only mock expensive/external operations
                4. For success cases: check status and response body structure
                5. For error cases: only check status code
                6. Keep tests minimal and focused`,
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

export class AddRouteWorkflow extends XStateWorkflow {
  machine = AddRouteWorkflowMachine;
  description = "Add a new route to an Express.js service.";
  cliArguments = [
    {
      name: "path",
      description: "Path of the new route (e.g. 'routes/call-series/create')",
    },
  ];
}
