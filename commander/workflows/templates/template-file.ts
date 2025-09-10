import type { Command } from "commander";
import { addNewLinesToString } from "@saflib/utils";

export const addTemplateFileCommand = (program: Command) => {
  program
    .command("template-file")
    .description(addNewLinesToString("TODO: Describe what this command does"))
    .action(async () => {
      // TODO: Implement the command logic here
      // TODO: Add any necessary options or arguments
      // TODO: Add logging if needed, see getSafReporters.md
      console.log("TODO: Implement command functionality");
    });
};
