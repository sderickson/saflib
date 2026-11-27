# App-level backups (plan)

Status: **agreed direction**, not built. Replaces the earlier off-site design.

## Shape

Two layers, through different systems:

1. **App-managed backups** (this plan): made on a schedule, checked, stored
   in a dedicated bucket on the host's blob store (GCS today, through
   `@saflib/object-store`'s vendor stores; `disk` in dev), cleaned up by a
   cron job, and visible in the admin. Good enough for most recoveries.
2. **The host's disk snapshots:** a different system at the same provider.
   They cover what the app can't protect against itself, e.g. a bug or
   compromise that deletes the backups.

Nothing goes to a developer's machine routinely. Restores use the
migration tool.

## What gets backed up

- Each of the product's databases: main, OAuth/integrations, jobs, cron,
  ops, and the active audit DB (sealed audit segments already ship to their
  own bucket).
- **Kratos's DB** (identities, credentials, second factors; losing it locks
  everyone out). It lives in Kratos's container, so its volume is also
  mounted into the app container (read-write, so SQLite's WAL works). This
  barely widens exposure: the app's admin API already reads identities.
- Not logs or issues: large and rebuildable.

## When backups are made

- **Daily** (job, scheduled by cron), tagged `daily`.
- **At each deploy**, tagged `deploy`: when a process boots on a new build
  (the ops boot record's `new_build`), once per build.
- **Before migrations**, tagged `pre-migration`: when a DB has pending
  migrations at startup, it's backed up before they run. This is the
  backup you want if a migration goes wrong.
- **By hand** ("back up now"), tagged `manual`.

## A backup run

For each database:

1. `VACUUM INTO` a temp file: a consistent, compacted copy while the app
   keeps writing.
2. Check the copy:
   - `PRAGMA integrity_check` must return `ok`
   - the latest migration id (which code version can read it)
   - per table: row count, and the earliest and latest `created_at` and
     `updated_at` where those columns exist
3. Compare with the previous backup. A table that shrank by more than about
   10%, or went empty, marks this backup **suspicious** (kept, but flagged).
4. Compress with zstd (as the audit seal does), upload with its md5 (the
   store verifies it on upload), and record a row: DB, time, size, hash,
   stats, result (`ok`, `suspicious` or `failed`).

## Read-back (weekly job)

Download the latest backup of each DB from the bucket (server-side, inside
the provider) and compare its hash with the recorded one. If it matches,
these are the bytes that passed the checks, so nothing is re-opened. This
catches objects that went missing or changed after upload.

## Cleanup (cron)

A retention policy per product, as a maximum age plus optional weekly and
monthly keeps. Every tag ages out the same way (no backup is kept forever).

- Template default: 14 days, no weekly or monthly keeps.
- Products whose terms cap how long data is held must keep the whole
  window under that cap, with margin: deleted customer data must not live
  on in backups past what the terms promise. (E.g. terms of one month →
  14 days.)

The most recent backup that passed is never deleted, so a run of
suspicious or failed backups can't push out the last good one (it still
ages out once a newer backup passes).

Turn on the bucket's soft delete (deleted objects recoverable for ~7 days)
as cheap protection against the app deleting too much. The app's key can
delete, since it does the cleanup; disk snapshots are the backstop.

## Admin: Status → Backups

- A calendar month, one dot per day: green = checked, yellow = suspicious,
  red = failed or missing. Deploy and pre-migration backups show as small
  marks on their day.
- Click a day to see each DB's size, row counts, timestamp range, change
  since the previous backup, hash and last read-back.
- "Back up now" (enqueues the job). No restore or download buttons.
- A Status tile: ok when today's backup passed and the last read-back
  matched; warn when a backup is suspicious or more than 36h old; bad when
  one failed, more than 72h old, or a read-back mismatched.
- `GET /ops/backups` for the agent; the runbook drops "Backups aren't
  reported".

## Restoring

An extension of the migration tool: pick a DB and a date; it downloads,
checks the hash, stops writes, swaps the file and restarts. The replaced
file is kept for a week. The same tool's "download a copy to look at"
(auto-deleted, see the analytics plan) can read a backup without touching
production.

## Relation to `@saflib/backup-*`

The existing suite becomes this: same object-store plumbing, but run as
base-jobs and cron, reported through ops, and no HTTP restore. In the
template, so every product gets it.

## Phases

1. Backup job: `VACUUM INTO`, checks, stats, comparison, upload, run
   records, tags. Backups bucket config in the template.
2. Cleanup cron with the retention policy; weekly read-back; deploy and
   pre-migration backups.
3. Status → Backups (calendar, day detail, tile); `/ops/backups`; runbook.
4. Kratos volume mount; Kratos DB included.
5. Restore in the migration tool.
