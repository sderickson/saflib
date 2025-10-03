#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { getCombinedEnvSchema, makeEnvParserSnippet } from "./env.ts";
import { writeFileSync, existsSync } from "fs";
import { buildMonorepoContext, getCurrentPackageName } from "@saflib/dev-tools";
import path from "path";
import { setupContext } from "@saflib/commander";
import { formatPath } from "@saflib/monorepo/dev";

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
  .description(
    "Generate env.ts. Pass --combined to also generate env.schema.combined.json.",
  )
  .option("-c, --combined", "Whether to export the combined schema as well.")
  .action(async (options) => {
    const currentPackageName = getCurrentPackageName();
    const combinedSchema = await getCombinedEnvSchema();
    const typeSnippet = await makeEnvParserSnippet(
      combinedSchema,
      currentPackageName,
    );
    writeFileSync("env.ts", typeSnippet);

    // Note: to use this with npm exec, need to include "--" prior to the "--combined" option
    if (options.combined) {
      writeFileSync(
        "env.schema.combined.json",
        JSON.stringify(combinedSchema, null, 2),
      );
    }
  });

program
  .command("generate-all")
  .description(
    "Generate env.ts files for all packages that have existing env files",
  )
  .action(async () => {
    const context = buildMonorepoContext();

    for (const packageName of context.packages) {
      const packagePath = context.monorepoPackageDirectories[packageName];
      const envTsPath = path.join(packagePath, "env.ts");
      const combinedSchemaPath = path.join(
        packagePath,
        "env.schema.combined.json",
      );

      // Only process packages that have an existing env.ts file
      if (!existsSync(envTsPath)) {
        continue;
      }

      console.log(`Generating env files for package: ${packageName}`);

      try {
        const combinedSchema = await getCombinedEnvSchema(packageName);
        const typeSnippet = await makeEnvParserSnippet(
          combinedSchema,
          packageName,
        );
        writeFileSync(envTsPath, typeSnippet);
        formatPath(envTsPath);

        // If the package has a combined schema file, update it too
        if (existsSync(combinedSchemaPath)) {
          writeFileSync(
            combinedSchemaPath,
            JSON.stringify(combinedSchema, null, 2),
          );
          formatPath(combinedSchemaPath);
          console.log(`  Updated env.schema.combined.json`);
        }

        console.log(`  Updated env.ts`);
      } catch (error) {
        console.error(`  Error processing package ${packageName}:`, error);
      }
    }

    console.log("Generate-all completed!");
  });

setupContext({ serviceName: "saf-env" }, () => {
  program.parse(process.argv);
});
