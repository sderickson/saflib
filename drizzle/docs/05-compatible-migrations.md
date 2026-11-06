# Compatible migrations

Every migration must work with the previous release's code. A blue-green deploy (see `@saflib/deploy-cli`) starts the new monolith, which migrates the database at startup, while the old one is still serving from the same database. A rollback runs the old code on the migrated schema.

## The rule: add now, remove later

- **Fine in any release:** new tables, new nullable columns, new columns with a default, new indexes.
- **Only once no deployed code uses the old shape:** dropping or renaming a table or column, adding a `NOT NULL` column without a default, or rebuilding a table without a column the previous release still uses.

So a rename takes two releases: add the new column (and write to both, or backfill), ship it; then drop the old column in a later release.

## The check

`saf-drizzle check-migrations` warns about statements that break the rule. db packages run it after `drizzle-kit generate`:

```json
"generate": "drizzle-kit generate && saf-drizzle check-migrations"
```

By default it checks the newest migration. `--since origin/main` checks every migration a branch adds, `--all` checks the whole history, and `--strict` exits non-zero on warnings, for CI.

drizzle-kit rebuilds a SQLite table (create `__new_x`, copy, drop `x`, rename) for changes `ALTER TABLE` can't make. The check reports those as rebuilds: they're compatible only if the new table keeps every column the previous release reads or writes.

A migration that breaks the rule on purpose, the "remove later" step, says so with a comment anywhere in its SQL file:

```sql
-- saf: contract (legacy_name unused since the release that added name)
ALTER TABLE `recipe` DROP COLUMN `legacy_name`;
```
