import type { Command } from "commander";
import { existsSync, writeFileSync } from "fs";
import path from "path";
import { getCombinedEnvSchema } from "../../src/env.ts";
import {
  buildMonorepoContext,
} from "@saflib/monorepo/workspace";
import { formatPath } from "@saflib/monorepo/dev";
import { generateEnvFiles } from "./generate.ts";

export const addGenerateAllCommand = (program: Command) => {
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

        if (!existsSync(envTsPath)) {
          continue;
        }

        console.log(`Generating env files for package: ${packageName}`);

        try {
          const { envTsPath: writtenPath } = await generateEnvFiles(
            packageName,
            packagePath,
          );
          formatPath(writtenPath);

          if (existsSync(combinedSchemaPath)) {
            const combinedSchema = await getCombinedEnvSchema(packageName);
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
};
