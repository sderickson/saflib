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
        src: fromPromise(
          async ({ input }: { input: AddSpaPageWorkflowContext }) => {
            // Replace all instances of 'HomePage' and 'home-page' with the new page name in PascalCase and kebab-case, including file names
            const { targetDir, pascalName, name } = input;
            // Rename files
            await execAsync(
              'find "' +
                targetDir +
                '" -type f -name "*HomePage*" -exec bash -c "mv \"$0\" \"${0/HomePage/' +
                pascalName +
                '}\"" {} \;',
            );
            await execAsync(
              'find "' +
                targetDir +
                '" -type f -name "*home-page*" -exec bash -c "mv \"$0\" \"${0/home-page/' +
                name +
                '}\"" {} \;',
            );
            // Replace in file contents
            await execAsync(
              'find "' +
                targetDir +
                '" -type f -exec sed -i "" -e "s/HomePage/' +
                pascalName +
                '/g" {} +',
            );
            await execAsync(
              'find "' +
                targetDir +
                '" -type f -exec sed -i "" -e "s/home-page/' +
                name +
                '/g" {} +',
            );
            return "Renamed placeholders";
          },
        ),
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
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => {
          // Run tests in the new page directory
          const { targetDir } = input;
          const { stdout, stderr } = await execAsync(
            `cd "${targetDir}" && npm test`,
          );
          if (stderr) {
            throw new Error(`Tests failed: ${stderr}`);
          }
          return stdout;
        }),
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
