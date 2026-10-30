#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import path from "node:path";
import { Command } from "commander";
import { setupContext } from "@saflib/commander";
import { squashMigrations } from "../../squash.ts";

const program = new Command()
  .name("saf-drizzle")
  .description("Drizzle migration tools. Run from a db package (where drizzle.config.ts is).");

program
  .command("squash")
  .description(
    "Replace all migrations with one baseline from the current schema, and record the squash so existing databases reconcile to it at startup. Only squash once every database you keep is migrated to the latest migration.",
  )
  .option("--migrations <dir>", "Migrations folder (drizzle config `out`)", "migrations")
  .action((options: { migrations: string }) => {
    const record = squashMigrations({
      migrationsDir: path.resolve(options.migrations),
    });
    console.error(
      `saf-drizzle: squashed ${record.replaces.length} migrations into baseline ${record.baseline}. Commit the migrations folder, including meta/squash.json.`,
    );
  });

setupContext({ serviceName: "saf-drizzle" }, () => {
  program.parseAsync(process.argv).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
});
