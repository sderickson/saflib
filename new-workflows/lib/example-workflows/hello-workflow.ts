import path from "node:path";
import { defineWorkflow, step } from "../engine.ts";
import { runCopyStep, type CopyStepInput } from "../steps/copy/copy-step.ts";
import { runUpdateStep, type UpdateStepInput } from "../steps/update.ts";
import { runCommandStep, type CommandStepInput } from "../steps/command.ts";

const templateDir = path.join(import.meta.dirname, "templates");

interface HelloWorkflowInput {
  name: string;
}

interface HelloWorkflowContext {
  name: string;
  cwd: string;
}

/**
 * Minimal end-to-end example for dogfooding `new-workflows/cli`: copies one
 * template file into cwd, prompts the agent to look at it, then runs `npm
 * --version` as a real command. Not a real platform workflow — just enough
 * surface (copy, update, command) to exercise the CLI loop against a real
 * scratch directory.
 */
export const HelloWorkflowDefinition = defineWorkflow<
  HelloWorkflowInput,
  HelloWorkflowContext
>({
  id: "example/hello",
  description: "Copies a template file, prompts about it, and runs a command. For dogfooding the CLI.",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "kebab-case name for the generated file",
        default: "example-thing",
      },
    },
    required: ["name"],
  },
  context: ({ input, cwd }) => ({ name: input.name, cwd }),
  steps: [
    step<CopyStepInput, HelloWorkflowContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: { file: path.join(templateDir, "template-file.ts") },
      targetDir: context.cwd,
      name: context.name,
    })),
    step<UpdateStepInput, HelloWorkflowContext>("update", runUpdateStep, () => ({
      fileId: "file",
      prompt: "Take a look at the generated file and confirm it looks right.",
    })),
    step<CommandStepInput, HelloWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["--version"],
    })),
  ],
});

export default HelloWorkflowDefinition;
