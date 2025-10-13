import type {
  CreateArgsType,
  WorkflowStep,
  WorkflowDefinition,
} from "./types.ts";
import type {
  WorkflowInput,
  WorkflowContext,
  WorkflowOutput,
  WorkflowRunMode,
} from "./types.ts";
import { workflowActions, workflowActors } from "./xstate.ts";
import {
  assign,
  fromPromise,
  raise,
  setup,
  type AnyStateMachine,
  type InputFrom,
} from "xstate";
import { contextFromInput } from "./utils.ts";
import type { WorkflowArgument } from "./types.ts";
import { existsSync, writeFileSync, unlinkSync } from "fs";
import { addNewLinesToString } from "@saflib/utils";
import { getWorkflowLogger } from "./store.ts";
import { addPendingMessage } from "./agents/message.ts";
import { execSync } from "child_process";
import path, { join } from "path";
import { handlePrompt } from "./prompt.ts";
import { checklistToString } from "./utils.ts";
import { tmpdir } from "os";

let lastSystemPrompt: string | undefined;

/**
 * Helper, identity function to infer types.
 *
 * By using this function on a Workflow object, it properly types the input object in the context function, and the context in the callbacks for the steps.
 *
 * I'm keeping this separate just because it's good to have the type inference piece separate where it can be messed with independently.
 */
export function defineWorkflow<
  I extends readonly WorkflowArgument[],
  C = any,
>(config: {
  input: I;
  context: (arg: {
    input: CreateArgsType<I> & {
      runMode?: WorkflowRunMode;
      cwd: string;
      systemPrompt?: string;
    };
  }) => C;
  id: string;
  description: string;
  checklistDescription?: (context: C) => string;
  sourceUrl: string;
  templateFiles: Record<string, string>;
  docFiles: Record<string, string>;
  steps: Array<WorkflowStep<C, AnyStateMachine>>;
  afterEach?: (context: C) => void;
  manageGit?:
    | boolean
    | {
        ignorePaths?: string[];
      };
}): WorkflowDefinition<I, C> {
  return config;
}

/**
 * Implementation of the makeMachineFromWorkflow function.
 */
function _makeWorkflowMachine<I extends readonly WorkflowArgument[], C>(
  workflow: WorkflowDefinition<I, C>,
) {
  type Input = CreateArgsType<I> & WorkflowInput;
  type Context = C & WorkflowContext;

  for (const [key, value] of Object.entries(workflow.templateFiles)) {
    if (!existsSync(value)) {
      console.log("Invalid template file path:", value);
      throw new Error(`Missing template file "${key}" for ${workflow.id}`);
    }
  }
  for (const [key, value] of Object.entries(workflow.docFiles)) {
    if (!existsSync(value)) {
      console.log("Invalid doc file path:", value);
      throw new Error(`Missing doc file ${key} for ${workflow.id}`);
    }
  }

  const actors: Record<string, AnyStateMachine> = {};
  for (let i = 0; i < workflow.steps.length; i++) {
    const actor_id = `actor_${i}`;
    const step = workflow.steps[i];
    actors[actor_id] = step.machine;
  }

  const states: Record<string, object> = {};
  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    const stateName = `step_${i}`;
    const validateStateName = `${stateName}_validate`;
    const nextStateName = `step_${i + 1}`;

    states[stateName] = {
      always: [
        {
          guard: ({ context }: { context: Context }) => {
            return step.skipIf({ context });
          },
          target: nextStateName,
        },
      ],
      entry: [
        {
          type: "systemPrompt",
        },
      ],
      invoke: {
        input: ({ context }: { context: Context }) => {
          return {
            ...step.input({ context }),
            // don't need checklist; the machine will compose their own
            runMode: context.runMode,
            templateFiles: context.templateFiles,
            copiedFiles: context.copiedFiles,
            docFiles: context.docFiles,
            agentConfig: context.agentConfig,
            cwd: context.cwd,
          };
        },
        src: `actor_${i}`,
        onDone: {
          target: validateStateName,
          actions: [
            {
              type: "afterEach",
            },
            assign({
              agentConfig: ({ context, event }) => {
                const output: WorkflowOutput = event.output;
                return output.agentConfig || context.agentConfig;
              },
              checklist: ({ context, event }) => {
                const output: WorkflowOutput = event.output;
                return [...context.checklist, output.checklist];
              },
              copiedFiles: ({ context, event }) => {
                const output: WorkflowOutput = event.output;
                if (output.copiedFiles) {
                  return { ...context.copiedFiles, ...output.copiedFiles };
                }
                return context.copiedFiles;
              },
              cwd: ({ context, event }) => {
                const output: WorkflowOutput = event.output;
                if (output.newCwd) {
                  return output.newCwd;
                }
                return context.cwd;
              },
            }),
          ],
        },
      },
    };

    states[validateStateName] = {
      invoke: {
        src: fromPromise(async ({ input }: { input: Context }) => {
          if (input.runMode === "dry") {
            return;
          }

          if (workflow.manageGit) {
            const successful = await handleGitChanges({
              context: input,
              checklistDescription:
                workflow.checklistDescription?.(input) || workflow.description,
              ignorePaths:
                typeof workflow.manageGit === "object"
                  ? workflow.manageGit.ignorePaths
                  : undefined,
            });
            if (!successful) {
              throw new Error("Failed to handle git changes");
            }
          }

          if (step.validate) {
            const output = await step.validate({ context: input });
            if (output) {
              const log = getWorkflowLogger();
              log.error(output);
              throw new Error(output);
            }
          }
          return;
        }),
        input: ({ context }: { context: Context }) => context,
        onDone: {
          target: nextStateName,
        },
        onError: [
          {
            guard: ({ context, event }: { context: Context; event: any }) => {
              if (context.runMode === "dry" || context.runMode === "script") {
                throw new Error(event.error);
              }
              return false;
            },
            target: nextStateName,
          },
          {
            target: stateName,
          },
        ],
      },
    };
  }
  states[`step_${workflow.steps.length}`] = {
    invoke: {
      src: fromPromise(async ({ input }: { input: Context }) => {
        if (input.runMode === "dry" || input.runMode === "script") {
          return;
        }
        if (workflow.manageGit) {
          execSync(`git add -A`, {
            cwd: gitRoot,
          });

          const gitCommitHeader =
            workflow.checklistDescription?.(input) || workflow.description;
          const gitCommitBody = checklistToString(input.checklist);
          const gitCommitMessage = `${gitCommitHeader}\n\n${gitCommitBody}`;
          const msgFile = join(tmpdir(), `commit-msg-${Date.now()}.txt`);
          writeFileSync(msgFile, gitCommitMessage);
          execSync(`git commit -F "${msgFile}"`, {
            cwd: gitRoot,
          });
          unlinkSync(msgFile);
        }
        return;
      }),
      input: ({ context }: { context: Context }) => context,
      onDone: {
        target: "end",
      },
    },
  };
  states["end"] = {
    type: "final",
  };

  return setup({
    types: {
      input: {} as Input,
      context: {} as Context,
      output: {} as WorkflowOutput,
    },
    actions: {
      ...workflowActions,
      afterEach: ({ context }) => {
        if (workflow.afterEach) {
          workflow.afterEach(context);
        }
      },
      systemPrompt: ({ context }) => {
        if (context.systemPrompt) {
          if (context.systemPrompt !== lastSystemPrompt) {
            addPendingMessage(context.systemPrompt);
            console.log("");
            console.log(addNewLinesToString(context.systemPrompt));
            console.log("");
            lastSystemPrompt = context.systemPrompt;
          }
        }
      },
    },
    actors: {
      ...workflowActors,
      ...actors,
    },
  }).createMachine({
    entry: raise({ type: "start" }),
    id: workflow.id,
    description: workflow.description,
    context: ({ input }) => {
      const context: Context = {
        ...workflow.context({
          input: {
            ...input,
            cwd: input.cwd || process.cwd(),
          },
        }),
        ...contextFromInput(input),
        templateFiles: workflow.templateFiles,
        docFiles: workflow.docFiles,
      };
      return context;
    },
    initial: "step_0",
    states,
    output: ({ context }) => ({
      checklist: {
        description:
          workflow.checklistDescription?.(context) || workflow.description,
        subitems: context.checklist,
      },
      agentConfig: context.agentConfig,
    }),
  });
}

/**
 * Takes a WorkflowsDefinition, as well as its Context and Input types, and creates an XState machine.
 *
 * This basically translates my simplified and scoped workflow machine definition to the full XState machine definition.
 */
export const makeWorkflowMachine = <C, I extends readonly WorkflowArgument[]>(
  config: WorkflowDefinition<I, C>,
) => {
  return _makeWorkflowMachine(defineWorkflow(config));
};

/**
 * Helper function for defining a step in a workflow, enforcing types properly.
 */
export const step = <C, M extends AnyStateMachine>(
  machine: M,
  input: (arg: { context: C & WorkflowContext }) => InputFrom<M>,
  options: {
    validate?: (arg: {
      context: C & WorkflowContext;
    }) => Promise<string | undefined>;
    skipIf?: (arg: { context: C & WorkflowContext }) => boolean;
  } = {},
): WorkflowStep<C, M> => {
  return {
    machine,
    input,
    validate: options.validate || (() => Promise.resolve(undefined)),
    skipIf: options.skipIf || (() => false),
  };
};

let gitRoot: string | undefined;

const getGitRoot = () => {
  if (!gitRoot) {
    gitRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf8",
    }).trim();
  }
  return gitRoot;
};

interface HandleGitChangesOptions {
  context: WorkflowContext;
  checklistDescription: string;
  ignorePaths?: string[];
}

const handleGitChanges = async ({
  context,
  checklistDescription,
  ignorePaths,
}: HandleGitChangesOptions) => {
  const gitRoot = getGitRoot();
  let tries = 0;
  while (true) {
    const expectedFiles = new Set(Object.values(context.copiedFiles || {}));
    const staged = execSync("git diff --cached --name-only", {
      encoding: "utf8",
      cwd: gitRoot,
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    // Get unstaged changes (modified files)
    const unstaged = execSync("git diff --name-only", {
      encoding: "utf8",
      cwd: gitRoot,
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    // Get untracked files
    const untracked = execSync("git ls-files --others --exclude-standard", {
      cwd: gitRoot,
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    const allFiles = [...staged, ...unstaged, ...untracked];
    const absoluteAllFiles = allFiles.map((file) => path.join(gitRoot, file));
    let otherFiles = absoluteAllFiles
      .filter((file) => !expectedFiles.has(file))
      .filter((file) => !file.endsWith("/saflib")); // tmp
    if (ignorePaths) {
      const absoluteIgnorePaths = ignorePaths.map((ignorePath) =>
        path.join(context.cwd, ignorePath),
      );
      otherFiles = otherFiles.filter(
        (file) =>
          !absoluteIgnorePaths.some((ignorePath) =>
            file.startsWith(ignorePath),
          ),
      );
    }

    if (otherFiles.length > 0) {
      tries++;
      if (tries > 3) {
        return false;
      }
      const { shouldContinue } = await handlePrompt({
        context: context,
        msg: `The following files had unexpected changes:
      ${otherFiles.map((file) => `- ${file}`).join("\n")}.
      
      You need to do one of two things:
      - If these changes were NOT in service to the original prompt, undo them.
      - If these changes WERE in service of the original prompt, commit exactly these files with an explanatory message.
      
      Remember! The goal of this workflow is just to do the following:
      ${checklistDescription}.
      
      If you have diverged from this goal, you need to undo the unscoped changes.`,
      });
      if (!shouldContinue || context.runMode === "script") {
        return false;
      }
    } else {
      return true;
    }
  }
};
