#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import path from "node:path";
import { buildMonorepoContext, type MonorepoContext } from "./workspace.ts";

function printPackageList(monorepoContext: MonorepoContext) {
  console.log("Packages in this monorepo:\n");
  for (const packageName of monorepoContext.packages) {
    const packageJson = monorepoContext.monorepoPackageJsons[packageName];
    const packageDir = monorepoContext.monorepoPackageDirectories[packageName];
    const relativePath =
      path.relative(monorepoContext.rootDir, packageDir) || "."; // Show '.' for root
    console.log(`  📦 ${packageName}`);
    console.log(`     Path: ${relativePath}`);
    if (packageJson.description) {
      console.log(`     Description: ${packageJson.description}`);
    }
    console.log(""); // Newline for spacing
  }
}

async function main() {
  const program = new Command()
    .name("saf-doc")
    .description(
      "CLI tool to explore and document the monorepo structure and packages.",
    )
    .action(() => {
      try {
        const monorepoContext = buildMonorepoContext(process.cwd());
        printPackageList(monorepoContext);
        // Implicitly, commander will show help for subcommands if no action is taken
        // or if help is explicitly requested for the main command.
        // To make it more explicit when no subcommand is given:
        if (process.argv.length <= 2) {
          // i.e., only 'node' and 'script.js'
          program.outputHelp();
        }
      } catch (error) {
        console.error(
          "Error:",
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    });

  // Dynamically add subcommands for each package
  let monorepoContext: MonorepoContext | undefined;
  try {
    monorepoContext = buildMonorepoContext(process.cwd());
  } catch (e) {
    // If context fails (e.g. not in a monorepo), we can still proceed
    // The main command might fail gracefully or we might not add subcommands.
    // For now, let's allow commander to handle the main command's potential failure.
  }

  if (monorepoContext) {
    for (const packageName of monorepoContext.packages) {
      const packageJson = monorepoContext.monorepoPackageJsons[packageName];
      const packageDir =
        monorepoContext.monorepoPackageDirectories[packageName];

      program
        .command(packageName)
        .description(
          `Show details for the ${packageName} package. Description: ${packageJson.description || "N/A"}`,
        )
        .action(() => {
          try {
            // Re-fetch context in action to ensure it's fresh if needed, though likely not for this simple case
            const currentContext = buildMonorepoContext(process.cwd());
            const targetPackageJson =
              currentContext.monorepoPackageJsons[packageName];
            if (targetPackageJson) {
              console.log(JSON.stringify(targetPackageJson, null, 2));
            } else {
              console.error(`Package ${packageName} not found.`);
            }
          } catch (error) {
            console.error(
              "Error:",
              error instanceof Error ? error.message : String(error),
            );
            process.exit(1);
          }
        });
    }
  }

  program.parse(process.argv);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
