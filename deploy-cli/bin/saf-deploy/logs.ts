import type { Command } from "commander";
import { addRemoteScriptCommand } from "../../src/commands.ts";

export const addLogsCommand = (program: Command) => {
  addRemoteScriptCommand(
    program,
    "logs",
    "logs",
    "Follow the production stack's logs on the server.",
  );
};
