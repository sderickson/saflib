import type { Command } from "commander";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { action } from "../../src/commands.ts";
import {
  loadState,
  runSteps,
  saveState,
  statePath,
  terminalIO,
} from "../../src/migrate/runner.ts";
import {
  dataDir,
  migrationSteps,
  realOps,
  type MigrateContext,
} from "../../src/migrate/steps.ts";

interface MigrateOptions {
  deploys: string;
  to: string;
  from?: string;
  previousName: string;
  restart?: boolean;
}

export const addMigrateCommand = (program: Command) => {
  program
    .command("migrate")
    .description(
      "Walk through moving the whole stack (every deploy on the host) to a new machine: create it, connect, mount its data disk, set it up, stage, then in a short window stop the old stack, copy the data, move the address and start the new one. Resumable; run from the monorepo root.",
    )
    .requiredOption(
      "--deploys <dirs>",
      "comma-separated deploy package directories on the host, platform deploy first",
    )
    .requiredOption(
      "--to <target>",
      "name for the new machine's target (env.remote.<target>), e.g. next",
    )
    .option(
      "--from <target>",
      "target the stack moves from (default: env.remote alone)",
    )
    .option(
      "--previous-name <target>",
      "target name the old machine's values are kept under once the new one is the default",
      "previous",
    )
    .option("--restart", "forget saved progress and start from step 1")
    .action(
      action(async (options: MigrateOptions) => {
        const deployDirs = options.deploys
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean)
          .map((d) => path.resolve(d));
        for (const dir of deployDirs) {
          if (!existsSync(path.join(dir, "env.remote"))) {
            throw new Error(`${dir} has no env.remote`);
          }
        }
        if (options.to === (options.from ?? "default")) {
          throw new Error("--to and --from name the same target");
        }
        const file = statePath(process.cwd(), options.to);
        if (options.restart) rmSync(file, { force: true });
        const state = loadState(file, options.to);
        const io = terminalIO();
        const ctx: MigrateContext = {
          deployDirs,
          from: options.from,
          to: options.to,
          previousName: options.previousName,
          state,
          io,
          ops: realOps,
        };
        try {
          dataDir(ctx); // fail now, not mid-walkthrough
          const steps = migrationSteps();
          io.print(
            `Migrating ${deployDirs.length} deploy(s) to the "${options.to}" target. Progress: ${path.relative(process.cwd(), file)}`,
          );
          if (state.completed.length > 0) {
            io.print(
              `Resuming: ${state.completed.length} of ${steps.length} steps done.`,
            );
          }
          const result = await runSteps(steps, ctx, state, io, () =>
            saveState(file, state),
          );
          if (result === "done") io.print("\nMigration complete.");
        } finally {
          io.close();
        }
      }),
    );
};
