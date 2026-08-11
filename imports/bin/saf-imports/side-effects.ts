import type { Command } from "commander";
import path from "node:path";
import { findMonorepoRoot, buildPackageIndex } from "../../src/resolve/index.ts";
import { scanPackageSideEffects } from "../../src/side-effects/scan-package.ts";

export const addSideEffectsCommand = (program: Command) => {
  const cmd = program
    .command("side-effects")
    .description("Scan packages for import-time side effects");

  cmd
    .command("scan")
    .description("Scan one or all workspace packages")
    .option("--package <name>", "Workspace package name")
    .option("--root <dir>", "Monorepo root")
    .action((options: { package?: string; root?: string }) => {
      const root = options.root
        ? path.resolve(options.root)
        : findMonorepoRoot(process.cwd());
      const index = buildPackageIndex(root);
      const entries = options.package
        ? [[options.package, index.get(options.package)] as const]
        : [...index.entries()];

      for (const [name, pkg] of entries) {
        if (!pkg) {
          console.error(`Package not found: ${name}`);
          continue;
        }
        const result = scanPackageSideEffects(pkg.dir, name);
        console.log(
          `${result.packageName}: safeForFalse=${result.safeForFalse} suggested=${JSON.stringify(result.suggestedSideEffects)} flags=${result.flags.length}`,
        );
        for (const f of result.flags.slice(0, 8)) {
          console.log(`  [${f.rule}] ${f.file}`);
        }
        if (result.flags.length > 8) {
          console.log(`  … ${result.flags.length - 8} more`);
        }
      }
    });
};
