import { Command } from "commander";
import type { WorkflowDefinition } from "../../core/types.ts";
import { addNewLinesToString } from "../../strings.ts";
import {
  createWorkflowLogger,
  setupWorkflowContext,
  type WorkflowLoggerOptions,
} from "../../core/store.ts";
import { addKickoffCommand } from "./kickoff.ts";
import { addChecklistCommand } from "./checklist.ts";
import { addStatusCommand } from "./status.ts";
import { addNextCommand } from "./next.ts";
import { addListCommand } from "./list.ts";
import { addSourceCommand } from "./source.ts";
import { addRunScriptsCommand } from "./run-scripts.ts";
import type {
  WorkflowCliOptions,
  WorkflowCommandOptions,
} from "./shared/types.ts";
/**
 * Given a list of workflow classes, runs a CLI for running workflows.
 *
 * The @saflib/workflows package can't run the CLI because other packages
 * depend on it to make workflows. So a separate package needs to depend on
 * those packages which depend on @saflib/workflows. This export allows
 * a separate package to actually gather all the ConcreteWorkflowRunners and expose them as a CLI.
 *
 * Use this also to customize which workflows are actually available.
 */
export async function runWorkflowCli(
  workflows: WorkflowDefinition[],
  options: WorkflowCliOptions = {},
) {
  const program = new Command()
    .name("saf-workflow")
    .description(
      addNewLinesToString(
        "Tool for agents to be given a series of prompts. For a list of available workflows, run:\n\nnpm exec saf-workflow help kickoff",
      ),
    );

  const commandOptions: WorkflowCommandOptions = {
    program,
    workflows,
    ...options,
  };

  addKickoffCommand(commandOptions);
  addStatusCommand(commandOptions);
  addNextCommand(commandOptions);
  addChecklistCommand(commandOptions);
  addListCommand(commandOptions);
  addSourceCommand(commandOptions);
  addRunScriptsCommand(commandOptions);

  // Set up workflow context
  const silentLogging = process.argv.includes("checklist");
  const loggerOptions: WorkflowLoggerOptions = {
    silent: silentLogging,
    ...options.loggerOptions,
  };

  const logger = options.logger || createWorkflowLogger(loggerOptions);
  setupWorkflowContext({
    logger,
    getSourceUrl: options.getSourceUrl,
  });

  await program.parseAsync(process.argv);
}

export { dryRunWorkflow, runWorkflow } from "./shared/utils.ts";
