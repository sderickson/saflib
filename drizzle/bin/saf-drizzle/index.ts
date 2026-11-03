#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import path from "node:path";
import { Command } from "commander";
import { setupContext } from "@saflib/commander";
import { squashMigrations } from "../../squash.ts";
import {
  allMigrations,
  checkMigrationFiles,
  CONTRACT_MARKER,
  latestMigration,
  migrationsSince,
} from "../../check-migrations.ts";

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

program
  .command("check-migrations")
  .description(
    `Warn about migrations the previous release's code may not survive (drops, renames, NOT NULL columns without a default, table rebuilds): blue-green deploys migrate while the old version still serves. Checks the newest migration unless told otherwise. A migration that breaks compatibility on purpose says so with "${CONTRACT_MARKER}".`,
  )
  .option("--migrations <dir>", "Migrations folder (drizzle config `out`)", "migrations")
  .option("--since <ref>", "Check migrations added since this git ref (e.g. origin/main)")
  .option("--all", "Check every migration")
  .option("--strict", "Exit non-zero when there are warnings")
  .action(
    (options: { migrations: string; since?: string; all?: boolean; strict?: boolean }) => {
      const dir = path.resolve(options.migrations);
      const latest = latestMigration(dir);
      const files = options.all
        ? allMigrations(dir)
        : options.since
          ? migrationsSince(dir, options.since)
          : latest
            ? [latest]
            : [];
      const warnings = checkMigrationFiles(files);
      for (const w of warnings) {
        console.error(
          `saf-drizzle: ${path.relative(process.cwd(), w.file)} ${w.reason}:\n    ${w.statement}`,
        );
      }
      if (warnings.length > 0) {
        console.error(
          `saf-drizzle: the previous release's code runs against this schema during a blue-green deploy and after a rollback. Split the change: add in this release, remove in a later one. If this is that later release, add "${CONTRACT_MARKER}" to the migration.`,
        );
        if (options.strict) process.exitCode = 1;
      }
    },
  );

setupContext({ serviceName: "saf-drizzle" }, () => {
  program.parseAsync(process.argv).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
});
