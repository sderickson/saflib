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

interface AddSpaPageWorkflowInput {
  name: string; // kebab-case, e.g. "welcome-new-user"
}

interface AddSpaPageWorkflowContext extends WorkflowContext {
  name: string; // kebab-case
  pascalName: string; // PascalCase, e.g. WelcomeNewUserPage
  targetDir: string;
  sourceDir: string;
}

function toPascalCase(name: string) {
  return (
    name
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("") + "Page"
  );
}

export const AddSpaPageWorkflowMachine = setup({
  types: {
    input: {} as AddSpaPageWorkflowInput,
    context: {} as AddSpaPageWorkflowContext,
  },
  actions: workflowActionImplementations,
  actors: workflowActors,
}).createMachine({
  id: "add-spa-page",
  description:
    "Create a new page in a SAF-powered Vue SPA, using a template and renaming placeholders.",
  initial: "copyTemplate",
  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceDir = path.join(
      __dirname,
      "web-template",
      "pages",
      "home-page",
    );
    const targetDir = path.join(process.cwd(), "pages", input.name + "-page");
    return {
      name: input.name,
      pascalName: toPascalCase(input.name),
      targetDir,
      sourceDir,
      loggedLast: false,
    };
  },
  entry: logInfo("Successfully began workflow"),
  states: {
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
          const { targetDir, pascalName, name } = input;

          // Get all files in the directory
          const files = await readdir(targetDir);

          // Rename files and update their contents
          for (const file of files) {
            const oldPath = path.join(targetDir, file);
            let newPath = oldPath;

            // Rename files containing HomePage or home-page
            if (file.includes("HomePage")) {
              newPath = path.join(
                targetDir,
                file.replace("HomePage", pascalName),
              );
              await rename(oldPath, newPath);
            } else if (file.includes("home-page")) {
              newPath = path.join(targetDir, file.replace("home-page", name));
              await rename(oldPath, newPath);
            }

            // Update file contents
            const content = await readFile(newPath, "utf-8");
            const updatedContent = content
              .replace(/HomePage/g, pascalName)
              .replace(/home-page/g, name);
            await writeFile(newPath, updatedContent);
          }

          return "Renamed placeholders";
        }),
        onDone: {
          target: "runTests",
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

export class AddSpaPageWorkflow extends XStateWorkflow {
  machine = AddSpaPageWorkflowMachine;
  description =
    "Create a new page in a SAF-powered Vue SPA, using a template and renaming placeholders.";
  cliArguments = [
    {
      name: "name",
      description:
        "Name of the new page in kebab-case (e.g. 'welcome-new-user')",
    },
  ];
}
