#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

/**
 * Umbrella static-analysis CLI: package layout/LoC + exports + dead-code checks.
 * Uses the same workdir analyzer as `saf-dev-site issues --workdir`.
 */
import path from "node:path";
import { Command } from "commander";
import { setupContext } from "@saflib/commander";
import {
  analyzeWorkdirPackages,
  findMonorepoRoot,
  type PackageIssue,
} from "@saflib/imports";

function printPackageIssues(
  packageName: string,
  issues: PackageIssue[],
  opts: { multi: boolean },
): void {
  if (opts.multi) {
    console.error(`======== ${packageName} ========`);
  }

  if (issues.length === 0) {
    console.log(`OK: ${packageName} — no architecture issues`);
    if (opts.multi) console.error("");
    return;
  }

  console.error(`${issues.length} issue(s) for ${packageName}:`);
  if (!opts.multi) {
    console.error(`triage: saflib/dev-tools/docs/package-issues.md\n`);
  }
  for (const i of issues) {
    console.error(`  [${i.kind}] ${i.filePath}: ${i.name}`);
  }
  if (opts.multi) console.error("");
}

const program = new Command()
  .name("analyze-package")
  .description(
    "Run package layout, LoC, exports, and dead-code checks on the working tree",
  )
  .option(
    "-p, --package <name>",
    "Workspace package name (repeat for multiple)",
    (value: string, previous: string[]) => [...previous, value],
    [] as string[],
  )
  .option(
    "--match <substring>",
    "Analyze every workspace package whose name includes this substring",
  )
  .option("--root <dir>", "Monorepo root (default: auto-detect)")
  .option(
    "--product-root <dir>",
    "Limit source walk to this repo-relative prefix (e.g. saflib/base)",
  )
  .option(
    "--workdir",
    "Analyze the working tree (default; accepted for symmetry with saf-dev-site)",
  )
  .option(
    "--no-exports-check",
    "Skip package.json exports heuristic diffs",
  )
  .action(
    async (options: {
      package: string[];
      match?: string;
      root?: string;
      productRoot?: string;
      exportsCheck?: boolean;
    }) => {
      const packages = options.package ?? [];
      if (packages.length === 0 && !options.match) {
        console.error(
          "Provide --package <name> (repeatable) and/or --match <substring>",
        );
        process.exitCode = 1;
        return;
      }

      const monorepoRoot = options.root
        ? path.resolve(options.root)
        : findMonorepoRoot(process.cwd());
      const productRoot = (options.productRoot ?? "").replace(/^\/+|\/+$/g, "");

      const result = await analyzeWorkdirPackages({
        monorepoRoot,
        productRoot: productRoot || undefined,
        packageNames: packages.length > 0 ? packages : undefined,
        packageNameMatch: options.match,
        includeExportsCheck: options.exportsCheck !== false,
      });

      if (result.packages.length === 0) {
        console.error("No matching workspace packages found.");
        process.exitCode = 1;
        return;
      }

      const multi = result.packages.length > 1;
      if (multi) {
        console.error(
          `# ${result.packages.length} package(s) — triage: saflib/dev-tools/docs/package-issues.md\n`,
        );
      }

      let totalIssues = 0;
      for (const pkg of result.packages) {
        printPackageIssues(pkg.packageName, pkg.issues, { multi });
        totalIssues += pkg.issues.length;
      }

      if (multi) {
        const withIssues = result.packages.filter((p) => p.issues.length > 0);
        console.error(
          `# Summary: ${withIssues.length}/${result.packages.length} package(s) with issues (${totalIssues} total)`,
        );
      }

      if (totalIssues > 0) {
        process.exitCode = 1;
      }
    },
  );

setupContext({ serviceName: "analyze-package" }, () => {
  program.parse(process.argv);
});
