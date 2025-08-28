import { setup } from "xstate";
import {
  workflowActions,
  workflowActors,
  logInfo,
  promptAgentComposer,
  XStateWorkflow,
  contextFromInput,
  type WorkflowInput,
  outputFromContext,
  copyTemplateStateComposer,
  type TemplateWorkflowContext,
  runNpmCommandComposer,
} from "@saflib/workflows";
import path from "path";
import { kebabCaseToPascalCase } from "@saflib/utils";

interface SpecProjectXstateWorkflowInput extends WorkflowInput {
  name: string;
}

interface SpecProjectXstateWorkflowContext extends TemplateWorkflowContext {
  name: string;
  safDocOutput: string;
  safWorkflowHelpOutput: string;
}

export const SpecProjectXstateWorkflowMachine = setup({
  types: {
    input: {} as SpecProjectXstateWorkflowInput,
    context: {} as SpecProjectXstateWorkflowContext,
  },
  actions: workflowActions,
  actors: workflowActors,
}).createMachine({
  id: "spec-project",
  description: "Write a product/technical specification for a project.",
  initial: "copyTemplate",
  context: ({ input }) => {
    const date = new Date().toISOString().split("T")[0];
    const projectDirName = `${date}-${input.name}`;
    const targetDir = path.resolve(process.cwd(), projectDirName);
    const context = {
      name: input.name,
      pascalName: kebabCaseToPascalCase(input.name),
      targetDir,
      sourceDir: path.resolve(import.meta.dirname, "./templates"),
      safDocOutput: "",
      safWorkflowHelpOutput: "",
      ...contextFromInput(input),
    };
    return context;
  },
  entry: logInfo("Successfully began workflow"),
  states: {
    ...copyTemplateStateComposer({
      stateName: "copyTemplate",
      nextStateName: "showSafDocOutput",
    }),

    ...promptAgentComposer<SpecProjectXstateWorkflowContext>({
      promptForContext: ({ context }) =>
        `The following packages are available in this monorepo. You can learn more about any given package by running \`npm exec saf-doc <package-name>\`.

${context.safDocOutput}`,
      stateName: "showSafDocOutput",
      nextStateName: "fillSpec",
    }),

    ...promptAgentComposer<SpecProjectXstateWorkflowContext>({
      promptForContext: ({ context }) =>
        `You are writing a product/technical specification for ${context.name}. Ask for an overview of the project if you haven't already gotten one, then given that description, fill the spec.md file which was just created.`,
      stateName: "fillSpec",
      nextStateName: "reviewSpec",
    }),

    ...promptAgentComposer<SpecProjectXstateWorkflowContext>({
      promptForContext: () =>
        `Go back and forth with the human on the spec. Have the human make updates and notes in the doc, then review their changes, make your own updates, and repeat until they sign off.`,
      stateName: "reviewSpec",
      nextStateName: "reviewChecklistGuide",
    }),

    ...promptAgentComposer<SpecProjectXstateWorkflowContext>({
      promptForContext: () =>
        `Before creating the checklist, please review the guide on writing spec project checklists located at writing-spec-project-checklists.md. This will help you create a proper implementation checklist with the correct format, workflow commands, and paths. Once you've reviewed the guide, run "npm exec saf-workflow next" to continue.`,
      stateName: "reviewChecklistGuide",
      nextStateName: "printWorkflows",
    }),

    ...runNpmCommandComposer({
      stateName: "printWorkflows",
      nextStateName: "promptForChecklist",
      command: "exec saf-workflow kickoff help",
    }),

    ...promptAgentComposer<SpecProjectXstateWorkflowContext>({
      promptForContext: () =>
        `See the above list of available workflow commands. Please fill out the checklist.md file with these commands and arguments.`,
      stateName: "promptForChecklist",
      nextStateName: "done",
    }),

    done: {
      type: "final",
    },
  },
  output: outputFromContext,
});

export class SpecProjectXstateWorkflow extends XStateWorkflow {
  machine = SpecProjectXstateWorkflowMachine;
  description = "Write a product/technical specification for a project.";
  cliArguments = [
    {
      name: "name",
      description:
        "kebab-case name of project to use in folder and git branch names and alike",
      exampleValue: "example-project",
    },
  ];
  sourceUrl = import.meta.url;
}
