import path from "node:path";
import type { Command } from "commander";
import {
  checkBudgets,
  formatViolation,
  type BudgetMode,
} from "../../src/budget/check-budgets.ts";

interface BudgetOptions {
  mode?: BudgetMode;
  root?: string;
}

export const addBudgetCommand = (program: Command) => {
  program
    .command("budget")
    .description(
      "Compare measured import graphs against package.json importBudget limits",
    )
    .option(
      "--mode <mode>",
      "warn: print violations and exit 0; error: exit 1 on violation",
      "warn",
    )
    .option("--root <dir>", "Monorepo root (default: auto-detect from cwd)")
    .action((options: BudgetOptions) => {
      const mode: BudgetMode =
        options.mode === "error" ? "error" : "warn";
      const { violations, packagesChecked } = checkBudgets({
        mode,
        root: options.root ? path.resolve(options.root) : undefined,
      });

      if (packagesChecked === 0) {
        console.log("No packages with importBudget found.");
        return;
      }

      if (violations.length === 0) {
        console.log(
          `OK: ${packagesChecked} package(s) within importBudget.`,
        );
        return;
      }

      const label = mode === "warn" ? "WARN" : "ERROR";
      console.log(
        `${label}: ${violations.length} importBudget violation(s) in ${packagesChecked} package(s):\n`,
      );
      for (const v of violations) {
        console.log(`  ${formatViolation(v)}`);
      }

      if (mode === "error") {
        process.exitCode = 1;
      }
    });
};
