import type { Command } from "commander";
import { writeFileSync } from "fs";
import path from "path";
import {
  getCombinedEnvSchema,
  getDirectEnvParents,
  getLocalEnvSchema,
  makeEnvParserSnippet,
} from "../../src/env.ts";
import {
  buildMonorepoContext,
  getCurrentPackageName,
} from "@saflib/monorepo/workspace";

export async function generateEnvFiles(packageName: string, packagePath: string) {
  const context = buildMonorepoContext();
  const localSchema = getLocalEnvSchema(packageName, context);
  const parents = getDirectEnvParents(packageName, context);
  const typeSnippet = await makeEnvParserSnippet(
    localSchema,
    packageName,
    parents,
  );
  const envTsPath = path.join(packagePath, "env.ts");
  writeFileSync(envTsPath, typeSnippet);
  return { localSchema, parents, envTsPath };
}

export const addGenerateCommand = (program: Command) => {
  program
    .command("generate")
    .description(
      "Generate env.ts. Pass --combined to also generate env.schema.combined.json.",
    )
    .option("-c, --combined", "Whether to export the combined schema as well.")
    .action(async (options) => {
      const currentPackageName = getCurrentPackageName();
      await generateEnvFiles(currentPackageName, process.cwd());

      // Note: to use this with npm exec, need to include "--" prior to the "--combined" option
      if (options.combined) {
        const combinedSchema = await getCombinedEnvSchema();
        writeFileSync(
          "env.schema.combined.json",
          JSON.stringify(combinedSchema, null, 2),
        );
      }
    });
};
