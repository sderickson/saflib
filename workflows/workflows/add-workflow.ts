import { fromPromise, raise, setup } from "xstate";
import {
  workflowActionImplementations,
  workflowActors,
  type WorkflowContext,
  promptAgent,
  XStateWorkflow,
} from "@saflib/workflows";
import { getSafReporters } from "@saflib/node";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { kebabCaseToPascalCase } from "../src/utils.ts";

interface AddWorkflowInput {
  name: string;
}

interface AddWorkflowContext extends WorkflowContext {
  workflowName: string;
  workflowPath: string;
  workflowIndexPath: string;
  pascalCaseWorkflowName: string;
  packageName: string;
}

interface InitializeWorkflowInput {
  workflowName: string;
  workflowIndexPath: string;
  pascalCaseWorkflowName: string;
}

const initializeWorkflowActor = fromPromise(
  async ({ input }: { input: InitializeWorkflowInput }): Promise<void> => {
    const { log } = getSafReporters();

    execSync(`mkdir -p workflows`);
    log.info("Upserted workflows directory");

    if (!existsSync(input.workflowIndexPath)) {
      execSync(`touch ${input.workflowIndexPath}`);
      writeFileSync(
        input.workflowIndexPath,
        `import { ${input.pascalCaseWorkflowName}Workflow } from "./${input.workflowName}.ts";
import type { ConcreteWorkflow } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflow[] = [${input.pascalCaseWorkflowName}Workflow];

export default workflowClasses;
`,
      );
      log.info("Created workflow index file");
    }

    execSync(`touch workflows/${input.workflowName}.ts`);
    const templatePath = new URL("workflow.template.ts", import.meta.url)
      .pathname;
    const workflowTemplate = readFileSync(templatePath, "utf8");
    writeFileSync(
      `workflows/${input.workflowName}.ts`,
      workflowTemplate
        .replaceAll("todo", input.workflowName)
        .replaceAll("ToDo", input.pascalCaseWorkflowName),
    );
    log.info("Created stub file");
  },
);

export const AddWorkflowMachine = setup({
  types: {
    input: {} as AddWorkflowInput,
    context: {} as AddWorkflowContext,
  },
  actions: {
    ...workflowActionImplementations,
  },
  actors: {
    ...workflowActors,
    initializeWorkflow: initializeWorkflowActor,
  },
}).createMachine({
  id: "add-workflow",
  description: "Create a new workflow",
  initial: "initialize",
  context: ({ input }) => {
    const workflowName = input.name || "";
    const pascalCaseWorkflowName = kebabCaseToPascalCase(workflowName);
    const workflowPath = `workflows/${workflowName}.ts`;
    const workflowIndexPath = `workflows/index.ts`;
    const packageName =
      readFileSync("package.json", "utf8").match(/name": "(.+)"/)?.[1] || "";

    return {
      workflowName,
      workflowPath,
      workflowIndexPath,
      pascalCaseWorkflowName,
      packageName,
      loggedLast: false,
    };
  },
  entry: () => {
    const { log } = getSafReporters();
    log.info("Successfully began add-workflow");
  },
  states: {
    initialize: {
      invoke: {
        src: "initializeWorkflow",
        input: ({ context }) => ({
          workflowName: context.workflowName,
          workflowIndexPath: context.workflowIndexPath,
          pascalCaseWorkflowName: context.pascalCaseWorkflowName,
        }),
        onDone: {
          target: "updateWorkflowFile",
        },
        onError: {
          actions: [
            () => {
              const { logError } = getSafReporters();
              logError(new Error("Failed to initialize workflow files."));
            },
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              `Failed to initialize the workflow files. Please check the file system and try again.`,
          ),
        },
        continue: {
          reenter: true,
          target: "initialize",
        },
      },
    },
    updateWorkflowFile: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `You are creating a new workflow named '${context.workflowName}'.

The file '${context.workflowPath}' has been created. Fill in the TODOs (name and description), then review the file to get oriented. Do NOT work on the machine itself yet.`,
            ),
          ],
        },
        continue: {
          target: "exportWorkflow",
        },
      },
    },
    exportWorkflow: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Ensure the new workflow '${context.workflowName}' is exported correctly. 
                1. An adjacent 'index.ts' file should already exist, check that it does.
                2. Import the new workflow class into 'workflows/index.ts' if it's not already there.
                3. Add the new workflow *class* (not an instance) to the default exported array in 'workflows/index.ts'.
                4. If needed, update the package.json of this package (${context.packageName}) to include a './workflows' export pointing to the 'workflows/index.ts' file.
                5. And! If you do include a './workflows' export, you might need to make the value of "main" be a "." export.`,
            ),
          ],
        },
        continue: {
          target: "ensureDependency",
        },
      },
    },
    ensureDependency: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Verify that '"${context.packageName}": "*"' is a dependency in the 'tools/workflows/package.json' file. If it's not present, add it and run 'npm install'.`,
            ),
          ],
        },
        continue: {
          target: "updateWorkflowList",
        },
      },
    },
    updateWorkflowList: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `Finally, update 'tools/workflows/list.ts'. 
                1. Import the workflow array exported from the package (e.g., \`import newWorkflows from '${context.packageName}/workflows';\`). Make sure to use the correct package name.
                2. Add the imported workflows to the \`workflowClasses\` array. You can use the spread operator (\`...newWorkflows\`) for this.`,
            ),
          ],
        },
        continue: {
          target: "verifyWorkflowList",
        },
      },
    },
    verifyWorkflowList: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `As a final check, run the command \`npm exec saf-workflow kickoff help\` in your terminal (any directory). Ensure that your new workflow "${context.workflowName}" appears in the list.`,
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

export class AddWorkflow extends XStateWorkflow {
  machine = AddWorkflowMachine;
  description = "Create a new workflow";
  cliArguments = [
    {
      name: "name",
      description:
        "The name of the new workflow to create (e.g., 'refactor-component')",
    },
  ];
}
