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
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import path from "path";

interface SpecProjectXstateWorkflowInput {
  name: string;
}

interface SpecProjectXstateWorkflowContext extends WorkflowContext {
  name: string;
  projectDirPath: string;
  specFilePath: string;
  checklistFilePath: string;
  safDocOutput: string;
  safWorkflowHelpOutput: string;
}

export const SpecProjectXstateWorkflowMachine = setup({
  types: {
    input: {} as SpecProjectXstateWorkflowInput,
    context: {} as SpecProjectXstateWorkflowContext,
  },
  actions: workflowActionImplementations,
  actors: workflowActors,
}).createMachine({
  id: "spec-project",
  description: "Write a product/technical specification for a project.",
  initial: "initializing",
  context: ({ input }) => {
    const date = new Date().toISOString().split("T")[0];
    const projectDirName = `${date}-${input.name}`;
    const specFilePath = path.join(projectDirName, "spec.md");
    const checklistFilePath = path.join(projectDirName, "checklist.md");
    const context = {
      name: input.name,
      projectDirPath: projectDirName,
      specFilePath: specFilePath,
      checklistFilePath: checklistFilePath,
      loggedLast: false,
      safDocOutput: "",
      safWorkflowHelpOutput: "",
    };
    return context;
  },
  entry: logInfo("Successfully began workflow"),
  states: {
    initializing: {
      invoke: {
        input: ({ context }) => context,
        src: fromPromise(
          async ({
            input: context,
          }: {
            input: SpecProjectXstateWorkflowContext;
          }) => {
            execSync(`mkdir -p ${context.projectDirPath}`);
            execSync(`touch ${context.specFilePath}`);

            const specTemplateContent = readFileSync(
              path.resolve(import.meta.dirname, "./spec.template.md"),
              "utf8",
            );
            writeFileSync(context.specFilePath, specTemplateContent);

            const checklistTemplateContent = readFileSync(
              path.resolve(import.meta.dirname, "./checklist.template.md"),
              "utf8",
            );
            const processedChecklistContent = checklistTemplateContent.replace(
              /<PROJECT_NAME>/g,
              context.name,
            );
            writeFileSync(context.checklistFilePath, processedChecklistContent);

            const safDocOutput = execSync("npm exec saf-doc").toString();
            return { safDocOutput };
          },
        ),
        onDone: {
          target: "showSafDocOutput",
          actions: [
            logInfo("Copied templates and ran saf-doc."),
            ({ event, context }) => {
              context.safDocOutput = (
                event.output as { safDocOutput: string }
              ).safDocOutput;
            },
          ],
        },
        onError: {
          actions: [
            logError(({ event }) => `Initialization failed: ${event.error}`),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              `Initialization failed. Please check the logs and help resolve the issue.`,
          ),
        },
        continue: {
          reenter: true,
          target: "initializing",
        },
      },
    },
    showSafDocOutput: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `The following packages are available in this monorepo. You can learn more about any given package by running \`npm exec saf-doc <package-name>\`.

${context.safDocOutput}`,
            ),
          ],
        },
        continue: {
          target: "fillSpec",
        },
      },
    },
    fillSpec: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `You are writing a product/technical specification for ${context.name}. Ask for an overview of the project if you haven't already gotten one, then given that description, fill ${context.specFilePath} which was just created.`,
            ),
          ],
        },
        continue: {
          target: "reviewSpec",
        },
      },
    },
    reviewSpec: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              () =>
                `Go back and forth with the human on the spec. Have the human make updates and notes in the doc, then review their changes, make your own updates, and repeat until they sign off.`,
            ),
          ],
        },
        continue: {
          target: "reviewChecklistGuide",
        },
      },
    },
    reviewChecklistGuide: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              () =>
                `Before creating the checklist, please review the guide on writing spec project checklists located at saflib/processes/docs/writing-spec-project-checklists.md. This will help you create a proper implementation checklist with the correct format, workflow commands, and paths. Once you've reviewed the guide, run "npm exec saf-workflow next" to continue.`,
            ),
          ],
        },
        continue: {
          target: "promptForChecklist",
        },
      },
    },
    promptForChecklist: {
      invoke: {
        src: fromPromise(async () => {
          const helpOutput = execSync(
            "npm exec saf-workflow kickoff help",
          ).toString();
          return { helpOutput };
        }),
        onDone: {
          actions: [
            logInfo("Ran `npm exec saf-workflow kickoff help`."),
            ({ event, context }) => {
              context.safWorkflowHelpOutput = (
                event.output as { helpOutput: string }
              ).helpOutput;
            },
            raise({ type: "prompt" }),
          ],
        },
        onError: {
          actions: [
            logError(
              ({ event }) => `Failed to run saf-workflow help: ${event.error}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: [
            promptAgent(({ context }) => {
              const helpOutput =
                context.safWorkflowHelpOutput ||
                "Could not retrieve saf-workflow help output.";
              return `The spec has been finalized. Please fill out the checklist.md located at ${context.checklistFilePath}.

Here is a list of available workflow commands to help you:
${helpOutput}

Once you have filled out the checklist, please trigger the "continue" event.`;
            }),
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

export class SpecProjectXstateWorkflow extends XStateWorkflow {
  machine = SpecProjectXstateWorkflowMachine;
  description = "Write a product/technical specification for a project.";
  cliArguments = [
    {
      name: "name",
      description:
        "kebab-case name of project to use in folder and git branch names and alike",
    },
  ];
}
