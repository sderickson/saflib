#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { getCombinedEnvSchema, makeEnvParserSnippet } from "./env.ts";
import { writeFileSync } from "fs";

const program = new Command();

program.command("print").action(async () => {
  const combinedSchema = await getCombinedEnvSchema();
  const stringsToPrint = Object.entries(combinedSchema.properties).map(
    ([key, value]) => {
      return [key, value.source];
    },
  );
  const maxWidths = stringsToPrint.reduce(
    (acc, [key, source]) => {
      return {
        key: Math.max(acc.key, key.length),
        source: Math.max(acc.source, source.length),
      };
    },
    { key: 0, source: 0 },
  );
  const formattedStrings = stringsToPrint.map(([key, source]) => {
    return `  ${key.padEnd(maxWidths.key)} - ${source.padEnd(maxWidths.source)}`;
  });
  console.log("\nEnv Variables defined and inherited by this package:");
  console.log(formattedStrings.join("\n"));
});

program
  .command("generate")
  .option("-c, --combined", "Whether to export the combined schema as well.")
  .action(async (options) => {
    const combinedSchema = await getCombinedEnvSchema();
    const typeSnippet = await makeEnvParserSnippet(combinedSchema);
    writeFileSync("env.ts", typeSnippet);

    // Note: to use this with npm exec, need to include "--" prior to the "--combined" option
    if (options.combined) {
      writeFileSync(
        "env.schema.combined.json",
        JSON.stringify(combinedSchema, null, 2),
      );
    }
  });

program.parse(process.argv);
