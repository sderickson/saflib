import { execSync } from "node:child_process";
import type { Command } from "commander";

export const addFormatCommand = (program: Command) => {
  const formatCmd = program
    .command("format")
    .description("Format a file with Prettier")
    .argument("<filename>", "File to format with Prettier")
    .action((fileName: string) => {
      if (fileName === "help") {
        formatCmd.outputHelp();
        return;
      }
      try {
        execSync(`prettier --write ${fileName}`);
      } catch (error) {
        console.error(`Error formatting ${fileName}:`, error);
        process.exit(1);
      }
    });
};
