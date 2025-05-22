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
  slug: string;
}

interface SpecProjectXstateWorkflowContext extends WorkflowContext {
  slug: string;
  projectDirPath: string;
  specFilePath: string;
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
    const projectDirName = `${date}-${input.slug}`;
    const specFilePath = path.join(projectDirName, "spec.md");
    return {
      slug: input.slug,
      projectDirPath: projectDirName,
      specFilePath: specFilePath,
      loggedLast: false,
    };
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
            const toLog = [];
            execSync(`mkdir -p ${context.projectDirPath}`);
            execSync(`touch ${context.specFilePath}`);
            toLog.push(`✔ Created directory: ${context.projectDirPath}`);

            const templateContent = readFileSync(
              path.resolve(import.meta.dirname, "./spec.template.md"),
              "utf8",
            );

            writeFileSync(context.specFilePath, templateContent);
            toLog.push(`✔ Created spec file: ${context.specFilePath}`);

            // Instead of this.print, we'll log or raise an event
            // For now, let's assume we want to log this to the agent.
            // This might need adjustment based on how saf-workflow handles this.
            return toLog.join("\n");
          },
        ),
        onDone: {
          target: "fillSpec",
          actions: logInfo(
            ({ event }) => `Initialization complete: ${event.output}`,
          ),
        },
        onError: {
          actions: [
            logError(({ event }) => `Initialization failed: ${event.error}`),
            raise({ type: "prompt" }), // Or a specific error state
          ],
        },
      },
      // If initialization fails and needs agent intervention
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
    fillSpec: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              ({ context }) =>
                `You are writing a product/technical specification for ${context.slug}. Ask for an overview of the project if you haven't already gotten one, then given that description, fill ${context.specFilePath} which was just created.`,
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
          // Assuming 'continue' means sign off
          target: "done",
        },
      },
    },
    done: {
      // there should always be a "done" state that is a final state.
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
