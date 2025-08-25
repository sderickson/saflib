import { Command } from "commander";
import { setupContext } from "@saflib/commander";
// TODO: Import your new command function here
// import { add{{pascalName}}Command } from "./{{name}}.ts";

/**
 * TODO: Add description of what this CLI does
 */
export function run{{pascalName}}Cli() {
  const program = new Command()
    .name("{{name}}")
    .description("TODO: Add CLI description");

  // TODO: Add your command here
  // add{{pascalName}}Command(program);

  setupContext(
    {
      serviceName: "{{name}}",
      silentLogging: false,
    },
    () => {
      program.parse(process.argv);
    },
  );
}
