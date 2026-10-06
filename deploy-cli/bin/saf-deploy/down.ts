import type { Command } from "commander";
import { addRemoteScriptCommand } from "../../src/commands.ts";

export const addDownCommand = (program: Command) => {
  addRemoteScriptCommand(
    program,
    "down",
    "down",
    "Stop the production stack on the server.",
  );
};
