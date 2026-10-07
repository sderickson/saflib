import type { Command } from "commander";
import { addRemoteScriptCommand } from "../../src/commands.ts";

export const addUpCommand = (program: Command) => {
  addRemoteScriptCommand(
    program,
    "up",
    "up",
    "Start or update the production stack on the server (docker compose up -d --force-recreate).",
  );
};
