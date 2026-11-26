# App-level backups (design, for review)

Status: **proposal**. Nothing here is built yet.

## Why move backups into the app

Today a product leans on the host's disk snapshots. They're cheap and worth
keeping, but they:

- live with the same provider and account as the server, so one account
  problem takes both
- are whole-disk and coarse: restoring one database means restoring the disk
- are never restored, so nobody knows whether they work
- can't be seen from the admin or the ops API, so neither a person nor the
  maintenance agent can tell whether they're happening

The admin already shows health, jobs, deploys and dependencies. Backups
belong there too: **"last backup 5h ago · restore test passed 2d ago"** as a
Status tile, in the digest, and at `GET /ops/backups` for the agent. Host
snapshots stay on as a second layer.

## What gets backed up

Every SQLite database on the data volume:

| Database | Why | Default |
| --- | --- | --- |
| Product DB | Customer data | yes |
| Kratos DB | Identities, credentials, second factors. Losing it locks everyone out | yes |
| Audit DB (active) | Sealed segments already ship elsewhere; the active one doesn't | yes |
| OAuth / integrations DBs | Connected accounts | yes |
| Jobs, cron | Queue state; small | yes |
| Ops DB | Tokens, alerts, issue state, deploy history | yes |
| Logs, issues | Large and rebuildable; little value after a restore | no (opt in) |

The Kratos DB lives in Kratos's container (`/var/lib/sqlite/db.sqlite`,
WAL mode). The simplest option is to mount that volume into the app
container as well and back it up with the same SQLite online-backup call.
This is open question 3.

Blobs in the object store aren't copied (see "Object store" below).

## How a backup runs

A nightly job (base-jobs/cron, so it's in the template and shows up on the
Jobs page):

1. For each registered DB: `DbManager.backupTo(key, tmpPath)`. This uses
   SQLite's online backup API and already exists in `@saflib/drizzle`, so
   writes keep going during the copy.
2. Gzip, then encrypt with a key from env (`SAF_BACKUP_KEY`, AES-256-GCM, or
   age so restore works with a stock CLI). Whoever holds the bucket can't
   read customer data.
3. Upload to an **off-host, S3-compatible bucket at a different provider**
   (e.g. Backblaze B2 or Cloudflare R2): `backups/<db>/<YYYY-MM-DD>T<hh>.db.gz.enc`.
4. Write a manifest next to it: sha256 and size per file, each DB's latest
   migration id, git commit, app version.
5. Record the run (ok/failed, sizes, duration) in the ops DB. A failure is an
   issue, like any job failure.

**Retention:** 7 daily, 4 weekly, 12 monthly, enforced by **bucket lifecycle
rules, not the app**. The app's key can write but not delete or overwrite
(object lock / write-only key), so an app bug or a leaked key can't wipe the
history.

**RPO:** one day. If that ever isn't enough, Litestream (continuous WAL
shipping, RPO in seconds) can replace step 1 later. It's another process
per DB, so not worth it yet.

## Restore test

A weekly job proves the latest backup restores:

1. Download the latest manifest and files into a temp dir; check sha256s.
2. Decrypt and decompress; open each with SQLite: `PRAGMA integrity_check`
   must return `ok`.
3. Check each DB's migration id matches what this build expects (or is an
   older id that migrations can bring forward).
4. Sanity checks against live: row counts of the main tables within a
   tolerance (e.g. not empty when live has 500 users), and the audit hash
   chain verifies (`verify-chain` already exists).
5. Record pass/fail with the reason; delete the temp files.

This runs on the server, so it proves the files are good, not that the whole
app comes up on them. The **home maintenance bot** does the full drill:
monthly, download, decrypt, start the app image against the restored data,
hit `/health` and sign in as a test user. That fits the "one host plus one
always-on watcher at home" setup.

## Visibility

- **Status tile** (system group): ok when the last backup is under 36h old
  and the last restore test passed and is under 10 days old; warn at
  36h / 10d; bad at 72h, or if the last restore test failed.
- **`GET /ops/backups`**: recent runs and restore tests with sizes and
  reasons. The runbook's "Backups aren't reported" line goes away.
- **Status → Backups tab**: the same table, plus "back up now" (an
  idempotent job enqueue; no restore button).

## Restoring for real

A CLI in the image, run deliberately by a person on the host. **Not an HTTP
endpoint.** The existing `@saflib/backup-http` restore route is exactly what
we shouldn't expose in production.

```sh
saf-backup list
saf-backup restore --db product --at 2026-11-25   # stops writes, swaps the file, restarts
```

Each DB is restored on its own, and the replaced file is kept alongside for
a week.

## Object store (blobs)

Agreed with your instinct: providers keep objects redundant, so copying
blobs isn't the priority. What actually loses blobs is **our own deletes and
overwrites** (a bug, a bad migration, a leaked key). So:

- turn on **bucket versioning + soft delete** (or object lock) with ~30 days'
  retention
- add a cheap consistency check to the restore test: every blob the DB
  references exists (sampled if large)
- later, if wanted: replicate to a second provider (most S3-compatible
  stores can replicate between buckets; no app code)

## Relation to the existing `@saflib/backup-*` suite

It's a standalone service with create/list/delete/restore over HTTP and a
cron that stores raw `.db` files through `@saflib/object-store`. Proposal:

- reuse its naming and object-store plumbing, but run backups as base-jobs
  and report through ops (tile, `/ops/backups`) instead of a separate service
- drop HTTP restore; keep list and "back up now"
- `@saflib/object-store` only has `disk` and `test` backends, so this needs
  an **S3-compatible backend**. That's the main new dependency.
- mark the old suite deprecated once this lands

## Open questions

1. **Off-host provider:** B2, R2 or something else? It just needs to be a
   different provider from the host, with S3 API, object lock and lifecycle
   rules.
2. **Key custody:** keep `SAF_BACKUP_KEY` in the host env plus your password
   manager, and on the home bot for drills? Losing it makes every backup
   useless.
3. **Kratos DB:** mount Kratos's volume into the app container (simplest),
   or have a small sidecar run `sqlite3 .backup`?
4. **Logs/issues DBs:** leave them out (as proposed)?
5. **Daily RPO:** OK for now?

## Phases

1. S3-compatible object-store backend; nightly encrypted backup job with
   manifest; run records; Status tile; `/ops/backups`; runbook. In the
   template.
2. Weekly restore test; tile and digest use it.
3. `saf-backup` restore CLI; deprecate the old suite.
4. Home-bot full restore drill (in the maintenance bot's plan).
5. Optional: Litestream, cross-provider blob replication.
