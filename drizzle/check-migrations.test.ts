import { describe, expect, it } from "vitest";
import { checkMigrationSql } from "./check-migrations.ts";

const reasons = (sql: string) => checkMigrationSql(sql).map((w) => w.reason);

describe("checkMigrationSql", () => {
  it("allows additive migrations", () => {
    expect(
      reasons(
        "ALTER TABLE `recipe` ADD `archived_at` integer;--> statement-breakpoint\nCREATE TABLE `note` (`id` text PRIMARY KEY NOT NULL);--> statement-breakpoint\nCREATE INDEX `note_id` ON `note` (`id`);\nALTER TABLE `recipe` ADD `kind` text DEFAULT 'a' NOT NULL;",
      ),
    ).toEqual([]);
  });

  it("flags drops, renames and NOT NULL columns without a default", () => {
    expect(
      reasons(
        "DROP TABLE `old`;--> statement-breakpoint\nALTER TABLE `recipe` DROP COLUMN `x`;--> statement-breakpoint\nALTER TABLE `recipe` RENAME COLUMN `a` TO `b`;--> statement-breakpoint\nALTER TABLE `recipe` RENAME TO `dish`;--> statement-breakpoint\nALTER TABLE `recipe` ADD `y` text NOT NULL;",
      ),
    ).toEqual([
      "drops table old",
      "drops a column",
      "renames a column",
      "renames a table",
      "adds a NOT NULL column without a default",
    ]);
  });

  it("calls out a drizzle table rebuild instead of a drop", () => {
    const sql = [
      "PRAGMA foreign_keys=OFF;",
      "CREATE TABLE `__new_recipe` (`id` text PRIMARY KEY NOT NULL);",
      "INSERT INTO `__new_recipe`(\"id\") SELECT \"id\" FROM `recipe`;",
      "DROP TABLE `recipe`;",
      "ALTER TABLE `__new_recipe` RENAME TO `recipe`;",
      "PRAGMA foreign_keys=ON;",
    ].join("--> statement-breakpoint\n");
    expect(reasons(sql)).toEqual([
      "rebuilds table recipe: check it keeps every column the previous release reads or writes",
    ]);
  });

  it("accepts an acknowledged contract migration", () => {
    expect(
      reasons("-- saf: contract (x unused since 1.4)\nALTER TABLE `t` DROP COLUMN `x`;"),
    ).toEqual([]);
  });
});
