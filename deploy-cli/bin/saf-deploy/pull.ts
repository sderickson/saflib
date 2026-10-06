import type { Command } from "commander";
import { addRemoteScriptCommand } from "../../src/commands.ts";

export const addPullCommand = (program: Command) => {
  addRemoteScriptCommand(
    program,
    "pull",
    "pull",
    "Pull this product's images (those from CONTAINER_REGISTRY in the prod compose file) on the server.",
  );
};
