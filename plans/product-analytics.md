# Product analytics (plan)

Status: **agreed direction**, not built.

## Goal

Adding key product events is part of building a feature, even before
anyone looks at them or sends them to a vendor. Every event should be
visible in the admin and to the maintenance agent: recent occurrences in
detail, and how often things happen over the long run. Growth tooling
(experiments, flags, dashboards, replays) stays with PostHog.

## Where events come from

- **Server:** `analytics.capture({ event, … })` from `@saflib/analytics-service`,
  typed from the product spec (exists).
- **Browser:** `emitProductEvent` in `@saflib/vue` posts to a new
  `POST /product-events` on the product's API, which calls the same
  `capture`. So browser and server events are treated identically.
  - Event names must be declared in the spec; properties at most ~2 KB.
  - Signed-in users: a loose per-user limit. Anonymous visitors: ~60 a
    minute per IP and ~600 a minute for all anonymous traffic combined.
    Over the limit, events are dropped and counted (`rate_limited`).
- **posthog-js** (when configured) keeps autocapture, replays and feature
  flags. Those go straight to PostHog, never through this pipeline. Behind
  the existing consent check.

## Where each event goes

1. **The logs DB, as a first-class row.** `log_entries` gains an `event`
   column (null for ordinary lines), indexed with `ts`. Properties stay in
   `fields`. Events stay interleaved with the request's other lines.
   - Retention by kind: events 180 days (`eventMaxAgeDays`), logs 14,
     per-request lines 7. The size cap prunes ordinary lines before events.
   - A view: `product_events (ts, event, user_id, request_id, fields)`.
   - Consent rules as today: users who haven't agreed get a random id per
     event, and device identifiers are stripped.
2. **Prometheus:** `saf_product_events_total{event}`. The only label is the
   event name, a typed union (unknown names count as `other`), so a few
   dozen series at most. No user, org or property labels.
3. **PostHog,** when configured (exists).

## Admin: Analytics (its own sidebar item, under Customers)

- **Explore:** run an SQL query over the logs DB. It opens on "events in
  the last 7 days, by name", with saved queries (events by day, unique
  users per event, one event's occurrences with properties). Results show
  as a table and link to Logs by request or user.
- **Trends:** one sparkline per event for 7, 30 and 90 days from
  Prometheus; "metrics off" when there's none.

## SQL over the logs DB: the guard rails

- A separate connection, opened read-only, with `PRAGMA query_only`, to
  the logs DB file only.
- Exactly one statement, and `stmt.readonly` must be true (rejects writes,
  `ATTACH` and most `PRAGMA`s; extensions are off by default).
- At most 1,000 rows and 5 seconds. Queries run in a worker thread that's
  killed on timeout.
- Site-admin session, or an ops token with a new `ops:query` scope (not
  part of `ops:read`).
- Every query is written to the audit log, SQL text included.
- Same API for the admin page and the agent (`POST /ops/logs/query`).
  There's no separate events endpoint. The runbook gets a "product
  activity" section.

**Never against the application DB** (or audit, or Kratos). To look at
production data, download a copy (below).

## `@saflib/rate-limit`

A small fixed-window limiter with two stores:

- **SQLite** (default): a counter table on the shared data volume, via
  `INSERT … ON CONFLICT DO UPDATE SET n = n + 1 RETURNING n`. Survives
  restarts, and blue and green share it.
- **Memory:** for tests.

The ops-token limiter (`createFixedWindowLimiter`) moves onto it. Redis
only if there's ever more than one host.

## Follow-up: looking at a production DB safely

Extend the migration tool's download: copy the DB into a fresh temp
directory and open it read-only. The directory is deleted on exit (even
after Ctrl-C or a crash) or after an hour regardless. Each download is
written to the audit log.

## Phases

1. `@saflib/rate-limit`; move the ops-token limiter onto it.
2. `event` column, per-kind retention and the `product_events` view;
   `capture` writes it. Prometheus counter.
3. `POST /product-events`; browser events go through it.
4. `POST /ops/logs/query` with its guard rails; Analytics page (Explore,
   Trends); runbook.
5. Download-a-copy for production DBs.
