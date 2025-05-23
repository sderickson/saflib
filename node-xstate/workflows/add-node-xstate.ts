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

interface AddNodeXstateWorkflowInput {}

interface AddNodeXstateWorkflowContext extends WorkflowContext {
  packageName: string;
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
  description: "Add XState functionality to a Node.js package",
  initial: "addDependency",
  context: (_) => {
    return {
      packageName: "",
      loggedLast: false,
    };
  },
  entry: logInfo("Adding XState functionality to Node.js package"),
  states: {
    addDependency: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(
          async ({ input }: { input: AddNodeXstateWorkflowContext }) => {
            // Add xstate dependency to package.json
            const { execSync } = await import("child_process");
            try {
              execSync("npm install xstate", { stdio: "inherit" });
              return "success";
            } catch (error) {
              throw new Error(`Failed to install xstate dependency: ${error}`);
            }
          },
        ),
        onDone: {
          target: "createMachinesDirectory",
          actions: logInfo(() => `XState dependency added successfully.`),
        },
        onError: {
          actions: [
            logError(
              ({ event }) => `Failed to add XState dependency: ${event.error}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              `Failed to install XState dependency. Please fix any issues and continue.`,
          ),
        },
        continue: {
          reenter: true,
          target: "addDependency",
        },
      },
    },
    createMachinesDirectory: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(
          async ({ input }: { input: AddNodeXstateWorkflowContext }) => {
            // Create machines directory and basic structure
            const fs = await import("fs");
            const path = await import("path");

            try {
              const machinesDir = "machines";
              if (!fs.existsSync(machinesDir)) {
                fs.mkdirSync(machinesDir, { recursive: true });
              }

              // Create a basic machine example file
              const exampleMachineContent = `import { setup } from "xstate";

export const exampleMachine = setup({
  types: {
    context: {} as {},
    events: {} as { type: "START" } | { type: "COMPLETE" },
  },
}).createMachine({
  id: "example",
  initial: "idle",
  states: {
    idle: {
      on: {
        START: "running",
      },
    },
    running: {
      on: {
        COMPLETE: "done",
      },
    },
    done: {
      type: "final",
    },
  },
});
`;

              const examplePath = path.join(machinesDir, "example.ts");
              if (!fs.existsSync(examplePath)) {
                fs.writeFileSync(examplePath, exampleMachineContent);
              }

              // Create index file for machines
              const indexContent = `export { exampleMachine } from "./example.ts";
`;
              const indexPath = path.join(machinesDir, "index.ts");
              if (!fs.existsSync(indexPath)) {
                fs.writeFileSync(indexPath, indexContent);
              }

              return "success";
            } catch (error) {
              throw new Error(
                `Failed to create machines directory structure: ${error}`,
              );
            }
          },
        ),
        onDone: {
          target: "updatePackageExports",
          actions: logInfo(
            () => `Machines directory and example files created successfully.`,
          ),
        },
        onError: {
          actions: [
            logError(
              ({ event }) =>
                `Failed to create machines directory: ${event.error}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              `Failed to create machines directory structure. Please fix any issues and continue.`,
          ),
        },
        continue: {
          reenter: true,
          target: "createMachinesDirectory",
        },
      },
    },
    updatePackageExports: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(
          async ({ input }: { input: AddNodeXstateWorkflowContext }) => {
            // Update package.json to export machines
            const fs = await import("fs");

            try {
              const packageJsonPath = "package.json";
              const packageJson = JSON.parse(
                fs.readFileSync(packageJsonPath, "utf8"),
              );

              // Add machines export if not already present
              if (!packageJson.exports) {
                packageJson.exports = {};
              }

              if (!packageJson.exports["./machines"]) {
                packageJson.exports["./machines"] = "./machines/index.ts";
              }

              fs.writeFileSync(
                packageJsonPath,
                JSON.stringify(packageJson, null, 2) + "\n",
              );

              return "success";
            } catch (error) {
              throw new Error(
                `Failed to update package.json exports: ${error}`,
              );
            }
          },
        ),
        onDone: {
          target: "done",
          actions: logInfo(
            () =>
              `Package exports updated successfully. XState functionality has been added.`,
          ),
        },
        onError: {
          actions: [
            logError(
              ({ event }) => `Failed to update package exports: ${event.error}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              `Failed to update package.json exports. Please fix any issues and continue.`,
          ),
        },
        continue: {
          reenter: true,
          target: "updatePackageExports",
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
  description =
    "Add XState functionality to a Node.js package including dependency installation, machines directory setup, and package export configuration";
  cliArguments = [];
}
