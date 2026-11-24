import type { Command } from "commander";
import { addRemoteScriptCommand } from "../../src/commands.ts";

export const addSetupCommand = (program: Command) => {
  addRemoteScriptCommand(
    program,
    "setup",
    "setup",
    "Install Docker if needed, make sure it's running, and turn on automatic security updates (rebooting when needed at 08:00 UTC).",
  );
};
