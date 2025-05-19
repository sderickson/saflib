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
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

interface AddSpaWorkflowInput {
  name: string;
}

interface AddSpaWorkflowContext extends WorkflowContext {
  name: string;
  packageName: string;
  targetDir: string;
  loggedLast: boolean;
}

export const AddSpaWorkflowMachine = setup({
  types: {
    input: {} as AddSpaWorkflowInput,
    context: {} as AddSpaWorkflowContext,
  },
  actions: workflowActionImplementations,
  actors: workflowActors,
}).createMachine({
  id: "add-spa",
  description:
    "Create a new SAF-powered frontend SPA using Vue, Vue-Router, and Tanstack Query",
  initial: "copyTemplate",
  context: ({ input }) => {
    const thisPackagePath = path.join(process.cwd(), "package.json");
    const thisPackage = JSON.parse(readFileSync(thisPackagePath, "utf8"));
    const thisPackageName = thisPackage.name;
    const thisPackageOrg = thisPackageName.split("/")[0];

    const targetDir = path.join(process.cwd(), "..", "web-" + input.name);

    return {
      name: input.name,
      packageName: `${thisPackageOrg}/web-${input.name}-client`,
      targetDir,
      loggedLast: false,
    };
  },
  entry: logInfo("Successfully began workflow"),
  states: {
    copyTemplate: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(async ({ input }) => {
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          const sourceDir = path.join(__dirname, "web-template");
          const { targetDir } = input;

          const { stdout, stderr } = await execAsync(
            `cp -r "${sourceDir}" "${targetDir}"`,
          );
          if (stderr) {
            throw new Error(`Failed to copy template: ${stderr}`);
          }
          return stdout;
        }),
        onDone: {
          target: "updatePackageName",
          actions: logInfo(
            ({ context }) =>
              `Successfully copied template directory to ${context.targetDir}`,
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
              "Failed to copy the template directory. Please check if the source directory exists and you have the necessary permissions.",
          ),
        },
        continue: {
          reenter: true,
          target: "copyTemplate",
        },
      },
    },
    updatePackageName: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Please update the package name and other template strings in the new SPA's package.json and other files. The new package name is ${context.packageName}.`,
            ),
          ],
        },
        continue: {
          target: "addDependency",
        },
      },
    },
    addDependency: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Please add ${context.packageName} as a dependency in clients/spas/package.json, then run 'npm install'.`,
            ),
          ],
        },
        continue: {
          target: "createEntryPoints",
        },
      },
    },
    createEntryPoints: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Please create index.html and main.ts files in clients/spas/${context.name} similar to other SPAs already there.`,
            ),
          ],
        },
        continue: {
          target: "updateViteConfig",
        },
      },
    },
    updateViteConfig: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Please update clients/spas/vite.config.ts to add proxy and input properties for the new SPA.`,
            ),
          ],
        },
        continue: {
          target: "updateCaddyfile",
        },
      },
    },
    updateCaddyfile: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Please update deploy/instance/remote-assets/config/Caddyfile to add the new SPA to the serve_prod_spas snippet.`,
            ),
          ],
        },
        continue: {
          target: "testDeployment",
        },
      },
    },
    testDeployment: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Please test the new SPA by running 'npm run build' and make sure there are no errors, then ask the user to run 'npm run prod-local' in the instance directory and have them verify the new page shows up.`,
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

export class AddSpaWorkflow extends XStateWorkflow {
  machine = AddSpaWorkflowMachine;
  description =
    "Create a new SAF-powered frontend SPA using Vue, Vue-Router, and Tanstack Query";
  cliArguments = [
    {
      name: "name",
      description: "Name of the new SPA (e.g. 'admin' for web-admin)",
    },
  ];
}
