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
import { existsSync } from "node:fs";

const execAsync = promisify(exec);

interface AddNodeXstateWorkflowInput {
  name: string; // e.g. "user-reports"
}

interface AddNodeXstateWorkflowContext extends WorkflowContext {
  name: string; // e.g. "user-reports"
  camelName: string; // e.g. userReports
  pascalName: string; // e.g. UserReports
  targetDir: string; // e.g. "./machines/user-reports/"
  sourceDir: string; // template directory
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

function toPascalCase(name: string) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export const AddNodeXstateWorkflowMachine = setup({
  types: {
    input: {} as AddNodeXstateWorkflowInput,
    context: {} as AddNodeXstateWorkflowContext,
  },
  actions: workflowActionImplementations,
  actors: workflowActors,
}).createMachine({
  id: "add-node-xstate",
  description: "Add a new XState machine with templates.",
  initial: "getOriented",
  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceDir = path.join(__dirname, "machine-template");
    const targetDir = path.join(process.cwd(), "machines", input.name);

    return {
      name: input.name,
      camelName: toCamelCase(input.name),
      pascalName: toPascalCase(input.name),
      targetDir,
      sourceDir,
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
                `This workflow will create a new XState machine called ${context.name}. 
                
                It will create the directory ${context.targetDir} and populate it with:
                - machine.ts (the XState machine definition)
                - machine.test.ts (basic test file)
                
                The machine will follow the pattern from the scheduled-calls machine, with a continueStateFor${context.pascalName} function that handles state persistence.`,
            ),
          ],
        },
        continue: {
          target: "createDirectory",
        },
      },
    },
    createDirectory: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => {
          const { targetDir } = input;
          await execAsync(`mkdir -p "${targetDir}"`);
          return "Directory created";
        }),
        onDone: {
          target: "copyTemplate",
          actions: logInfo(
            ({ context }) => `Created directory ${context.targetDir}`,
          ),
        },
        onError: {
          actions: [
            logError(
              ({ event }) =>
                `Failed to create directory: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              "Failed to create the target directory. Please check permissions.",
          ),
        },
        continue: {
          reenter: true,
          target: "createDirectory",
        },
      },
    },
    copyTemplate: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => {
          const { targetDir, sourceDir } = input;
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
          const { targetDir, camelName, pascalName, name } = input;

          // Get all files in the directory
          const files = await readdir(targetDir);
          for (const file of files) {
            if (!file.includes("machine-template")) {
              continue;
            }
            const oldPath = path.join(targetDir, file);
            const newPath = path.join(
              targetDir,
              file.replace("machine-template", "machine"),
            );
            await rename(oldPath, newPath);
            const content = await readFile(newPath, "utf-8");
            const updatedContent = content
              .replace(/MachineTemplate/g, pascalName)
              .replace(/machineTemplate/g, camelName)
              .replace(/machine-template/g, name)
              .replace(/ScheduledMachineTemplate/g, `Scheduled${pascalName}`)
              .replace(/scheduledMachineTemplate/g, `scheduled${pascalName}`)
              .replace(/scheduledMachineTemplates/g, `scheduled${pascalName}s`);
            await writeFile(newPath, updatedContent);
          }

          return "Renamed placeholders";
        }),
        onDone: {
          target: "implementMachine",
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
    implementMachine: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `The machine template has been created in ${context.targetDir}. 
                
                Please review and update the generated files:
                1. Update the machine.ts file to implement your specific state machine logic
                2. Update the machine.test.ts file to use the correct entity type and database operations
                3. Make sure the imports and types are correct for your use case
                
                The continueStateFor${context.pascalName} function is already set up to handle state persistence.`,
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

export class AddNodeXstateWorkflow extends XStateWorkflow {
  machine = AddNodeXstateWorkflowMachine;
  description = "Add a new XState machine with templates.";
  cliArguments = [
    {
      name: "name",
      description: "Name of the machine (e.g. 'user-reports')",
    },
  ];
}
