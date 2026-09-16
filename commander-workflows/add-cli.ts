import path from "node:path";
import {
  defineWorkflow,
  step,
  makeLineReplace,
  runCopyStep,
  runUpdateStep,
  runCommandStep,
  runPromptStep,
  type CopyStepInput,
  type UpdateStepInput,
  type CommandStepInput,
  type PromptStepInput,
} from "@saflib/new-workflows";
import { packageStubRoot } from "@saflib/templates";

const sourceDir = packageStubRoot;

interface AddCliInput {
  name: string;
}

interface AddCliContext {
  cwd: string;
  targetDir: string;
  groupName: string;
  targetName: string;
}

/**
 * Ported from `commander/workflows/add-cli.ts` — same templates, same
 * prompts, same step order, running on the new sqlite-backed engine
 * instead of XState.
 */
export const AddCLIWorkflowDefinition = defineWorkflow<AddCliInput, AddCliContext>({
  id: "commander/add-cli",

  description: "Create  a new CLI with Commander.js, accessible through npm exec",

  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "The name of the cli to create (e.g., 'build' or 'deploy')",
      },
    },
    required: ["name"],
  },

  context: ({ input, cwd }) => {
    const targetDir = path.join(cwd, "bin", input.name);
    return {
      cwd,
      targetDir,
      groupName: input.name,
      targetName: input.name,
    };
  },

  steps: [
    step<CopyStepInput, AddCliContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: {
        index: path.join(sourceDir, "bin/__group-name__/index.ts"),
      },
      name: context.groupName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step<UpdateStepInput, AddCliContext>("update", runUpdateStep, () => ({
      fileId: "index",
      prompt: `Update **index.ts**, resolving any TODOs.`,
    })),

    step<CommandStepInput, AddCliContext>("command", runCommandStep, ({ context }) => ({
      command: "chmod",
      args: ["+x", path.relative(context.cwd, path.join(context.targetDir, "index.ts"))],
    })),

    step<PromptStepInput, AddCliContext>("prompt", runPromptStep, ({ context }) => {
      const relativePath = path.relative(context.cwd, path.join(context.targetDir, "index.ts"));
      return {
        prompt: `Add ${relativePath} to the package's bin folder.

        It should look like this:
        "bin": {
          "${context.groupName}": "${relativePath}"
        }`,
      };
    }),

    step<CommandStepInput, AddCliContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["install", "@saflib/commander"],
    })),

    step<PromptStepInput, AddCliContext>("prompt", runPromptStep, ({ context }) => ({
      prompt: `Run the command \`npm exec ${context.groupName}\` to verify that the cli is working correctly.

      Run \`npm exec ${context.groupName}\` and it should display help information without errors.`,
    })),
  ],
});

export default AddCLIWorkflowDefinition;
