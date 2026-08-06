# Squashing Migrations

Over time the `migrations/` folder grows — mostly from per-migration snapshot JSON under `meta/`. Drizzle Kit has no first-class squash command, but you can reset to a single baseline migration without wiping existing databases.

`DbManager` runs [`reconcileSquashedMigrations`](../reconcile-squashed-migrations.ts) before `migrate()`. That helper detects when the journal was reset while a DB still has old `__drizzle_migrations` rows, and rewrites history to match the new journal so the baseline is not re-applied on top of an existing schema.

## When to squash

- Prod (and any shared environments) are caught up on the current head migration.
- You're fine with stale local DBs being wiped and recreated if someone is behind.
- You accept that one-off **data** backfills in old SQL (e.g. `UPDATE … SET …`) will not be replayed on **new** databases — only schema from the current Drizzle definitions is regenerated. Bake important defaults into the schema if new installs need them.

## Steps

Work from the db package (e.g. `daemon/service/db`).

1. **Backup** any on-disk DB you care about keeping:

   ```bash
   cp data/db-<deployment>.sqlite data/db-<deployment>.pre-squash-backup.sqlite
   ```

2. **Delete** the migrations folder entirely (not just the SQL files — an empty `meta/` without `_journal.json` confuses `drizzle-kit generate`):

   ```bash
   rm -rf migrations
   ```

3. **Regenerate** a single baseline from the current schema:

   ```bash
   npm run generate
   ```

   You should get one `migrations/0000_….sql` plus `meta/_journal.json` and `meta/0000_snapshot.json`.

4. **Verify an existing DB** — connect the same way the app does (or restart `npm run dev`). Expect a log about squashed history being rewritten, then a clean migrate. App tables and row counts should be unchanged; `__drizzle_migrations` should contain one row matching the new journal `when`.

5. **Verify a fresh DB** — delete (or point at a new) sqlite file, connect again, and confirm the baseline creates the full schema.

6. **Ship** the deleted old migrations, the new baseline, and the `@saflib/drizzle` reconcile change together. Existing environments reconcile on first boot; brand-new environments just run the baseline.

## How reconcile decides

It rewrites `__drizzle_migrations` only when **all** of these are true:

- The migrations table already has rows.
- Some applied `created_at` values are **not** in the current journal (`when`s) — orphan history from before the squash.
- Some journal entries are missing from applied history.
- The DB already has application tables (not only `__drizzle_migrations`).

Otherwise it no-ops: fresh installs and normal incremental migrations behave as before.

Drizzle itself decides what to run by comparing each journal entry's `when` to the latest `__drizzle_migrations.created_at`. After a squash without reconcile, a new baseline's `when` is newer than old history, so Drizzle would try to execute the full `CREATE TABLE` SQL and fail. Reconcile prevents that.

## Local recovery

If something goes wrong and you kept a backup:

```bash
cp data/db-<deployment>.pre-squash-backup.sqlite data/db-<deployment>.sqlite
```

Or delete the sqlite file and let `ALLOW_DB_CREATION=true` recreate from the baseline.
