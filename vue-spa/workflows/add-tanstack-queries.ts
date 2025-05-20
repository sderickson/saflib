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
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readdir, rename, readFile, writeFile } from "node:fs/promises";

const execAsync = promisify(exec);

interface AddTanstackQueriesWorkflowInput {
  path: string; // e.g. "requests/feature.ts"
}

interface AddTanstackQueriesWorkflowContext extends WorkflowContext {
  name: string; // e.g. "feature"
  camelName: string; // e.g. feature
  targetDir: string; // e.g. "/<abs-path>/requests/"
  targetFile: string; // e.g. "/<abs-path>/requests/feature.ts"
  sourceFile: string; // e.g. "/<abs-path>/workflows/query-template.ts"
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
    const targetFile = path.join(process.cwd(), input.path);
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
      sourceFile,
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
          const { targetDir, sourceFile, targetFile } = input;
          await execAsync(`mkdir -p "${targetDir}"`);
          const { stdout, stderr } = await execAsync(
            `cp "${sourceFile}" "${targetFile}"`,
          );
          if (stderr) {
            throw new Error(`Failed to copy template: ${stderr}`);
          }
          return stdout;
        }),
        onDone: {
          target: "renamePlaceholders",
          actions: logInfo(
            ({ context }) => `Copied template file to ${context.targetFile}`,
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
              "Failed to copy the template file. Please check if the source file exists and you have the necessary permissions.",
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
          const { targetFile, name, camelName } = input;
          const content = await readFile(targetFile, "utf-8");
          const updatedContent = content
            .replace(/feature/g, name)
            .replace(
              /Feature/g,
              camelName.charAt(0).toUpperCase() + camelName.slice(1),
            );
          await writeFile(targetFile, updatedContent);
          return "Renamed placeholders";
        }),
        onDone: {
          target: "promptExport",
          actions: logInfo(() => `Renamed all placeholders in the file.`),
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
    promptExport: {
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
