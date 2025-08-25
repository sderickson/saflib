import { Command } from "commander";
import type { WorkflowMeta } from "@saflib/workflows";
import { addNewLinesToString } from "@saflib/utils";
import { setupContext } from "@saflib/commander";
import { addKickoffCommand } from "./kickoff.ts";
import { addChecklistCommand } from "./checklist.ts";
import { addStatusCommand } from "./status.ts";
import { addNextCommand } from "./next.ts";
import { addListCommand } from "./list.ts";
import { addSourceCommand } from "./source.ts";

/**
 * Uses Commander.js to run a CLI for running workflows.
 *
 * The @saflib/workflows package can't run the CLI because other packages
 * depend on it to make workflows. So a separate package needs to depend on
 * those packages which depend on @saflib/workflows. This export allows
 * a separate package to actually compose and expose the CLI.
 *
 * This also means you can customize which workflows are actually available.
 */
export function runWorkflowCli(workflows: WorkflowMeta[]) {
  const program = new Command()
    .name("saf-workflow")
    .description(
      addNewLinesToString(
        "Tool for agents to be given a series of prompts. For a list of available workflows, run:\n\nnpm exec saf-workflow help kickoff",
      ),
    );

  addKickoffCommand(program, workflows);
  addStatusCommand(program, workflows);
  addNextCommand(program, workflows);
  addChecklistCommand(program, workflows);
  addListCommand(program, workflows);
  addSourceCommand(program, workflows);

  setupContext(
    {
      serviceName: "workflows",
      silentLogging: process.argv.includes("checklist"),
    },
    () => {
      program.parse(process.argv);
    },
  );
}
