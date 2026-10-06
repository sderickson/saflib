import type { Command } from "commander";
import { addRemoteScriptCommand } from "../../src/commands.ts";

export const addSetupCommand = (program: Command) => {
  addRemoteScriptCommand(
    program,
    "setup",
    "setup",
    "Install Docker on the server if needed and make sure it's running.",
  );
};
