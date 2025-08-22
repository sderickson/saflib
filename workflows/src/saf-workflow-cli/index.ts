import { Command } from "commander";
import type { WorkflowMeta } from "@saflib/workflows";
import { addNewLinesToString } from "../utils.ts";
import { setupContext } from "./context.ts";
import { addKickoffCommand } from "./kickoff.ts";
import { addChecklistCommand } from "./checklist.ts";
import { addStatusCommand } from "./status.ts";
import { addNextCommand } from "./next.ts";
import { addListCommand } from "./list.ts";
import { addSourceCommand } from "./source.ts";

export function runWorkflowCli(workflows: WorkflowMeta[]) {
  setupContext({ silentLogging: process.argv.includes("checklist") });

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

  program.parse(process.argv);
}
