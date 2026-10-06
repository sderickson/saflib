import type { Command } from "commander";
import { addRemoteScriptCommand } from "../../src/commands.ts";

export const addPurgeCommand = (program: Command) => {
  addRemoteScriptCommand(
    program,
    "purge",
    "purge",
    "Uninstall Docker from the server.",
  );
};
