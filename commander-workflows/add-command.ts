import path from "node:path";
import {
  defineWorkflow,
  step,
  parsePath,
  makeLineReplace,
  runCopyStep,
  runUpdateStep,
  runCommandStep,
  runPromptStep,
  type CopyStepInput,
  type UpdateStepInput,
  type CommandStepInput,
  type PromptStepInput,
  type ParsePathOutput,
} from "@saflib/new-workflows";
import { packageStubRoot } from "@saflib/templates";

const sourceDir = packageStubRoot;

interface AddCommandInput {
  path: string;
}

interface AddCommandContext extends ParsePathOutput {
  cwd: string;
}

/**
 * Ported from `commander/workflows/add-command.ts` — same templates, same
 * prompts, same step order, running on the new sqlite-backed engine
 * instead of XState.
 */
export const AddCommandWorkflowDefinition = defineWorkflow<
  AddCommandInput,
  AddCommandContext
>({
  id: "commander/add-command",

  description: "Create a new CLI command and add it to an existing Commander.js CLI",

  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative path to the new command file, e.g. bin/cli-name/command-name.ts",
      },
    },
    required: ["path"],
  },

  context: ({ input, cwd }) => ({
    ...parsePath(input.path, {
      requiredPrefix: "./bin/",
      requiredSuffix: ".ts",
      cwd,
    }),
    cwd,
  }),

  steps: [
    step<CopyStepInput, AddCommandContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: {
        command: path.join(sourceDir, "bin/__group-name__/__target-name__.ts"),
        index: path.join(sourceDir, "bin/__group-name__/index.ts"),
      },
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step<UpdateStepInput, AddCommandContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "command",
      prompt: `Update **${context.targetName}.ts**

      Implement the command functionality.`,
    })),

    step<PromptStepInput, AddCommandContext>("prompt", runPromptStep, ({ context }) => ({
      prompt: `Test the command was added correctly by running:
      npm exec ${context.groupName} ${context.targetName}`,
    })),

    step<CommandStepInput, AddCommandContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["install", "@saflib/docs", "--save-dev"],
    })),

    step<CommandStepInput, AddCommandContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["exec", "saf-docs", "generate"],
    })),
  ],
});

export default AddCommandWorkflowDefinition;
