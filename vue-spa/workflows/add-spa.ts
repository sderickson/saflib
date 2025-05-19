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
interface AddSpaWorkflowInput {
  name: string;
}

interface AddSpaWorkflowContext extends WorkflowContext {
  name: string;
  packageName: string;
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

    return {
      name: input.name,
      packageName: `${thisPackageOrg}/${input.name}`,
      loggedLast: false,
    };
  },
  entry: logInfo("Successfully began workflow"),
  states: {
    copyTemplate: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Please copy the web-template directory from saflib/vue-spa/workflows/web-template to clients/web-${context.name} with appropriate modifications.`,
            ),
          ],
        },
        continue: {
          target: "updatePackageName",
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
                `Please add ${context.packageName} as a dependency in clients/spas/package.json.`,
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
