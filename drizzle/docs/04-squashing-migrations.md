# Squashing Migrations

Over time the `migrations/` folder grows — mostly from per-migration snapshot JSON under `meta/`. Drizzle Kit has no squash command, so `@saflib/drizzle` provides one: `saf-drizzle squash` replaces every migration with a single baseline generated from the current schema, and records the squash so existing databases keep working.

## How startup checks migration history

`DbManager` runs [`checkMigrationHistory`](../migration-history.ts) before `migrate()`. It compares the database's `__drizzle_migrations` rows with the journal (`meta/_journal.json`):

- **Every applied migration is in the journal.** Normal case: Drizzle applies whatever is pending.
- **Some applied migrations are not in the journal, and a recorded squash replaced them.** The squash is listed in `meta/squash.json`, its baseline is in the journal, and the database had applied every migration it replaced. The check rewrites `__drizzle_migrations` to mark the baseline as applied without re-running its SQL. Migrations added after the squash then run as usual.
- **Anything else stops startup** with a `MigrationHistoryError` that names the migrations involved:
  - applied migrations the code does not know about, e.g. a dev database migrated by another branch;
  - a squash the database was behind on, since marking the baseline applied would skip schema it never got;
  - a pending migration older than the newest applied one, which Drizzle would otherwise skip silently. This also usually means another branch migrated the database.

The check is exact: a squash is only recognized when it was recorded deliberately.

## When to squash

- Prod (and any shared environments) are caught up on the current head migration. Any database that is behind will refuse to start after the squash.
- You're fine with stale local DBs being wiped and recreated if someone is behind.
- You accept that one-off **data** backfills in old SQL (e.g. `UPDATE … SET …`) will not be replayed on **new** databases — only schema from the current Drizzle definitions is regenerated. Bake important defaults into the schema if new installs need them.

## Steps

Work from the db package (where `drizzle.config.ts` is, e.g. `service/db`).

1. **Back up** any on-disk DB you care about keeping.

2. **Squash:**

   ```bash
   npx saf-drizzle squash
   ```

   This deletes `migrations/`, runs `drizzle-kit generate` for one `0000_….sql` baseline, and writes `migrations/meta/squash.json` with the baseline and the migrations it replaced. Pass `--migrations <dir>` if your drizzle config's `out` is not `migrations`.

3. **Verify an existing DB** — restart the app or `npm run dev`. Expect a log about marking the baseline as applied, then a clean migrate. App tables and row counts should be unchanged; `__drizzle_migrations` should contain one row matching the baseline's journal `when`.

4. **Verify a fresh DB** — delete (or point at a new) sqlite file, connect again, and confirm the baseline creates the full schema.

5. **Ship** the migrations folder, including `meta/squash.json`. Existing environments reconcile on first boot; brand-new environments just run the baseline. Keep `squash.json` in the repo: it is how startup tells a squash apart from unknown migrations.

## Recovering from a refused startup

If startup reports unknown or skipped migrations on a dev database, it was most likely migrated by another branch. Either check out that branch, restore a copy of the database from before it ran, or delete the database and let `ALLOW_DB_CREATION=true` recreate it from the migrations.
