import { Command } from "commander";
import { setupContext } from "@saflib/commander";

/**
 * TODO: Add description of what this command does
 */
export function add{{pascalName}}Command(program: Command) {
  program
    .command("{{name}}")
    .description("TODO: Add command description")
    .action(async () => {
      setupContext(
        {
          serviceName: "{{name}}",
          silentLogging: false,
        },
        async () => {
          // TODO: Implement command logic here
          console.log("{{name}} command executed");
        },
      );
    });
}
