#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
/**
 * Wipe copied golden migrations so the next `drizzle-kit generate` writes a
 * clean baseline from the product's real schemas only (drizzle recreates the
 * journal).
 *
 * Golden `base/service/db/migrations` includes stub tables
 * (`__group_name___table`, `__offshoot_name___table`). Those schema files are
 * skipped on product/init, but the migration history is not — so the first
 * `drizzle/update-schema` generate asks interactively whether a new table was
 * renamed from a stub. Deleting migrations avoids that.
 *
 * Usage: node reset-product-db-migrations.ts <product>/service/db
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function resetProductDbMigrations(dbPackageRoot: string): void {
  fs.rmSync(path.join(path.resolve(dbPackageRoot), "migrations"), {
    recursive: true,
    force: true,
  });
}

const invokedAsCli =
  process.argv[1] !== undefined &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (invokedAsCli) {
  const dbRoot = process.argv[2];
  if (!dbRoot) {
    console.error("Usage: reset-product-db-migrations.ts <product>/service/db");
    process.exit(1);
  }
  if (!fs.existsSync(path.resolve(dbRoot))) {
    console.error(`Missing db package: ${dbRoot}`);
    process.exit(1);
  }
  resetProductDbMigrations(dbRoot);
  console.log(`removed ${path.resolve(dbRoot)}/migrations`);
}
