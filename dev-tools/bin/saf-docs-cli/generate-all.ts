import type { Command } from "commander";
import { addNewLinesToString } from "@saflib/utils";
import { buildMonorepoContext, type MonorepoContext } from "@saflib/dev-tools";
import { generateCommand } from "./generate.ts";
import { existsSync } from "node:fs";
import { join } from "node:path";

export const addGenerateAllCommand = (program: Command) => {
  program
    .command("generate-all")
    .description(
      addNewLinesToString(
        "Generate documentation for all packages in the monorepo that have a docs directory",
      ),
    )
    .action(async () => {
      const monorepoContext = buildMonorepoContext();
      const packagesWithDocs = findPackagesWithDocsDirectory(monorepoContext);

      console.log(
        `Found ${packagesWithDocs.length} packages with docs directories:`,
      );
      packagesWithDocs.forEach((pkg) => console.log(`- ${pkg}`));

      for (const packageName of packagesWithDocs) {
        console.log(`\n=== Generating docs for ${packageName} ===`);
        try {
          generateCommand({ monorepoContext, packageName });
          console.log(`✓ Successfully generated docs for ${packageName}`);
        } catch (error) {
          console.error(`✗ Failed to generate docs for ${packageName}:`, error);
        }
      }

      console.log(
        `\n=== Completed generating docs for ${packagesWithDocs.length} packages ===`,
      );
    });
};

function findPackagesWithDocsDirectory(
  monorepoContext: MonorepoContext,
): string[] {
  const packagesWithDocs: string[] = [];

  for (const packageName of monorepoContext.packages) {
    const packageDir = monorepoContext.monorepoPackageDirectories[packageName];
    const docsDir = join(packageDir, "docs");

    if (existsSync(docsDir)) {
      packagesWithDocs.push(packageName);
    }
  }

  return packagesWithDocs.sort();
}
