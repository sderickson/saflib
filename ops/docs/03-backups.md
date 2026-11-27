# Backups

The app backs up its own SQLite databases (and Kratos's) to a bucket of
their own. The host's disk snapshots are the second layer.

## What happens on its own

- **Daily** (after 03:00 UTC), **at each deploy** (first process of a new
  build) and **before migrations** (a snapshot taken right before pending
  migrations run, uploaded shortly after).
- Each backup is a `VACUUM INTO` copy, checked (`integrity_check`, latest
  migration, per-table rows and created/updated ranges), compared with the
  last good backup (a table emptied or shrunk by more than 10% marks it
  *suspicious*), compressed (zstd), hashed (sha256) and uploaded.
- Weekly, the latest good backup of each database is downloaded and its hash
  compared (*read-back*).
- Backups older than the retention window (default 14 days) are deleted;
  the most recent good backup of each database is always kept.
- Status → Backups shows a calendar; the Backups tile turns yellow or red
  when something's off; `GET /ops/backups` is the same for agents.

## Setting it up

- `BACKUPS_GCS_BUCKET`: the bucket (create it with soft delete on; the app
  writes, reads and deletes there). Without it, development uses a folder on
  the ops data volume, and production shows "Not set up".
- `KRATOS_SQLITE_PATH`: Kratos's SQLite file, mounted into the app container
  (read via WAL, so the app user needs write access to its `-shm` file).
- Retention: keep it well under whatever the product's terms promise about
  holding deleted data.

## Looking at or restoring a backup

The `backups` command in the product's ops package runs inside the app
image (where the bucket credentials and data volumes are):

```sh
node --experimental-strip-types ./bin/backups.ts list [--db main]
node --experimental-strip-types ./bin/backups.ts download <id> --to /tmp/main.sqlite   # verified copy; delete it after
node --experimental-strip-types ./bin/backups.ts restore <id> --yes
```

`restore` replaces the live file, so stop the app first (both colors) and
run it in a one-off container with the same volumes:

```sh
docker compose stop <app>-blue <app>-green
docker compose run --rm --no-deps <app>-blue node --experimental-strip-types ./bin/backups.ts restore <id> --yes
docker compose start <app>-blue
```

It downloads the backup, checks its hash and integrity, checkpoints the
current file, moves it aside as `<file>.replaced-<time>` (deleted after a
week) and puts the backup in its place. Kratos's own migrations (run by
`kratos-migrate`) aren't preceded by a snapshot; the deploy backup covers
them.
