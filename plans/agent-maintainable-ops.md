# Agent-maintainable ops: built-in telemetry and an ops API for SAF products

> **Living document.** Whoever works on this (human or agent) keeps the
> **Status** section and **Decisions log** current as work lands. If you pick
> this up cold, read Status first, then Design, then the next unchecked phase.

## Status

- **Phase:** 1 (ops token, health, manifest)
- **Last updated:** 2026-11-08
- **Next action:** Phase 1. Start with the `ops` suite skeleton and the
  `ops-token` security scheme.

| Phase | Description | State |
| ----- | ----------- | ----- |
| 0 | Spikes: Prometheus footprint, graph rendering, Mermaid on GitHub | done (droplet run and embed tests moved to Phase 5) |
| 1 | Ops token, `/ops` spec skeleton, `/ops/health`, build manifest and deploy markers | todo |
| 2 | Persistent logs: SQLite store, write-time redaction, message templates, log endpoints | todo |
| 3 | Issues: persistent grouped errors *and* warnings, resolve/ignore; first digest | todo |
| 4 | Agent trial: CLI/skill plus a daily scheduled agent on one product | todo |
| 5 | Prometheus: per-host stack, standard histograms, query proxy, graph snapshots | todo |
| 6 | Alerting: rules, Alertmanager to Slack and email, dead man's switch, external checks | todo |
| 7 | Audit: query endpoints and security summaries | todo |
| 8 | Dependencies: deployed manifest, available versions, advisories, update policy | todo |
| 9 | Roll out to all products; alerts wake the agent (stretch) | todo |

## Context

SAF's pitch is that it's easy to stand up a new product. The other half should
be that it's easy to *keep running*, with an agent doing most of the routine
maintenance and a human approving the results.

Today the pieces are split between development tooling and vendors:

- `node-log` is an in-memory Winston ring buffer with dev routes. Production
  logs go to whatever transport is configured (`vendors/loki`).
- `errors` has an `ErrorService` abstraction with an in-memory dev backend.
  Production swaps in Sentry (`vendors/sentry-*`).
- `node-metrics` parses `prom-client` output into an admin snapshot. Nothing
  keeps history.
- `audit` is solid in production (hash chain, sealing, rotation), but only
  site-admin sessions can read it.
- Nothing exposes deployed dependency versions, alerting, or a single
  "what's wrong" view.

Self-hosting the full Loki/Sentry/PostHog/Grafana stack is heavy (self-hosted
Sentry and PostHog each want around 16 GB of RAM). It would also create one
central, sensitive store across all projects. Agents don't need dashboards.
They need **query endpoints that return compact JSON**, plus a way to make a
graph when a picture explains more than words.

## Goals

1. Every SAF product ships with production telemetry by default: logs, grouped
   issues (errors *and* warnings), audit, Prometheus metrics with histograms,
   alerts, health checks, and dependency status.
2. One **ops API** per product, read with a scoped token, that an agent can use
   to answer: what's new, what's broken, what's slow, what's suspicious, and
   what's out of date.
3. An agent with that token plus a PR-only GitHub token can run regularly,
   open issues and fix PRs, and never merge, deploy or see user data.
4. Lightweight: the only extra containers are Prometheus, Alertmanager and
   node_exporter. Everything else lives inside the app and SQLite.

## Non-goals

- Dashboards or Grafana-like UI. The existing admin pages (`node-log-vue`,
  `errors-vue`, audit) get production modes and nothing more.
- Tracing (still out of scope, as in `node/docs/02-instrumentation.md`).
- Product analytics.
- A central, cross-project telemetry store. Each product owns its own data.
- PII, request bodies or query values in any telemetry.
- Self-hosting the repo and CI. GitHub stays the source for code, CI results
  and security alerts, and the agent reads those from GitHub directly.
- Auto-merge or auto-deploy.

## Design

### Topology

```
 droplet (one per host)
 ┌───────────────────────────────────────────────────────────────┐
 │ app (monolith)                                                │
 │   winston ──▶ logs.db   (SQLite, WAL, rotated, FTS5)          │
 │   logError/warn ──▶ issues.db (grouped by fingerprint)        │
 │   audit ──▶ audit.db (existing)                               │
 │   prom-client /metrics ◀── scraped by Prometheus              │
 │   /ops/* API  ──▶ reads the stores above, proxies PromQL      │
 │   /ops/alerts/webhook ◀── Alertmanager                        │
 │                                                               │
 │ prometheus (internal only) ── rules ──▶ alertmanager          │
 │ node_exporter (disk, memory, CPU)       │                     │
 └─────────────────────────────────────────┼─────────────────────┘
                                           ├─▶ Slack, email
                                           └─▶ Watchdog heartbeat ─▶ external dead man's switch
 external uptime checks ──▶ each site + /ops/health
 agent (ephemeral, e.g. GitHub Actions or a scheduled cloud agent)
   ──▶ /ops/* with an ops token        ──▶ GitHub: branches, PRs, issues only
```

**Plan for a split.** Everything here works with Prometheus and
Alertmanager on the app host *or* on their own small machine. Prometheus
scrapes over a private network or Tailscale. The app finds Prometheus through
a configured `PROMETHEUS_URL`, and Alertmanager finds the app's webhook
through its URL. Nothing assumes the two share a host. Start on one host;
moving monitoring to a second machine is a config change. A second machine
also lets monitoring report on an app host that's in trouble.

Telemetry stores are **separate SQLite files** on the data volume (not the
product DB). Writes go through an in-process queue with batched inserts. If
the queue overflows, entries are dropped and a counter metric records it.
Telemetry must never block or fail a request. Each store has an age limit
*and* a size cap.

### The ops API

A new suite, `ops` (`ops-spec`, `ops-http`, `ops-sdk` and an `ops-cli`),
pulls together endpoints that are backed by other suites' stores. Mounted at
`/ops` on the product API.

**Auth: a new `ops-token` security scheme.**

- Bearer tokens with a recognizable prefix (`safops_…`) so secret scanners
  catch leaks.
- Stored hashed. Created and revoked from the admin UI or CLI. Each token has
  a name and an optional expiry.
- Scopes:
  - `ops:read`: every GET.
  - `ops:triage`: change issue status (resolve, ignore, reopen) and
    acknowledge alerts. Low risk, but kept separate so a read-only token stays
    possible.
- Not tied to a user session, and grants nothing outside `/ops`.
- Rate limited. Every ops API call is itself audit-logged.
- **Reachability:** `/ops` is public, protected by the token and rate
  limits, so agents in GitHub Actions or the cloud can reach it without
  joining a private network. Caddy can still restrict it to an IP allowlist
  or Tailscale per product.

**Tailscale** is part of the setup, for everything that isn't `/ops`:

- Prometheus and Alertmanager UIs are reachable only on the tailnet, so the
  Prometheus `/graph` deep links work for the human.
- Cross-host scraping, when monitoring moves to its own machine.
- Optionally, SSH and deploys over the tailnet, so public port 22 can close.

**Endpoints (first cut):**

| Area | Endpoints |
| ---- | --------- |
| Health | `GET /ops/health`: aggregate check results (see *Other health signals*) |
| Digest | `GET /ops/digest?since=`: everything new since a timestamp, each item linking to its detail endpoint |
| Logs | `GET /ops/logs?since&until&level&service&q&template&requestId&limit&cursor` · `GET /ops/logs/templates?since&onlyNew=` |
| Issues | `GET /ops/issues?status&level&since&sort` · `GET /ops/issues/:id` · `GET /ops/issues/:id/occurrences` · `POST /ops/issues/:id/{resolve,ignore,reopen}` |
| Audit | `GET /ops/audit?since&until&eventType&actor&limit&cursor` · `GET /ops/audit/summary?since=` |
| Metrics | `GET /ops/metrics/query?query&time` · `GET /ops/metrics/query_range?query&start&end&step` · `GET /ops/metrics/series?match[]` · `POST /ops/metrics/snapshots` (graph) |
| Alerts | `GET /ops/alerts?state&since` · `POST /ops/alerts/:id/ack` |
| Dependencies | `GET /ops/dependencies?onlyActionable=` |
| Deploys | `GET /ops/deploys` |

### Untrusted content and redaction

Even with no request values, telemetry carries text that attackers control:
URL paths, user agents, exception messages that echo input, client error
reports, CSP reports. The design assumes some of it is hostile.

- **Redaction: detect, mask, and raise an issue.** The rule for logs is
  *identifiers, not identities*: user IDs, request IDs and record IDs are
  fine; names, emails, contact details and secrets are not. Redaction is a
  safety net, not the main control. When it fires, it means a log call needs
  fixing, so it becomes work rather than silently disappearing.
  - **Detection** runs as a Winston format before every store write, and on
    issue messages, stacks and audit projections:
    - *Key names* (any depth in `fields`): `password`, `secret`, `token`,
      `authorization`, `cookie`, `apiKey`, `email`, `phone`, `name`,
      `firstName`, `lastName`, `displayName`, `address`, `body`, `query`
      (configurable per product).
    - *Value patterns*: emails; phone numbers; JWTs and `Bearer …`; known key
      prefixes (`safops_`, `ghp_`, `github_pat_`, `sk-`, `AKIA…`,
      `xox[bp]-`); long high-entropy strings; Luhn-valid card numbers.
    - *URLs*: query strings and fragments are always stripped (not flagged,
      since this is expected).
    - *IP addresses*: truncated (/24 for IPv4, /48 for IPv6) rather than
      flagged. Rate-limit and abuse investigation keep a useful signal
      without storing a full personal identifier.
  - **Masking:** the log line is still written, but the matched value is
    replaced with `[redacted:<kind>]`. The rest of the line, and its
    template, stay intact, so the log is still useful for debugging.
  - **Issue:** each detection records a `warn` issue,
    `log.redaction:<kind>`, fingerprinted by message template and logger or
    call site. Temporary debug logging that leaks something therefore shows
    up in the digest until someone (often the agent) fixes the log call and
    resolves the issue.
  - Names in free text can't be detected reliably. Key-name detection and
    the issue loop catch the common case; code review catches the rest.
  - Tests assert that each key and pattern kind is masked and raises an
    issue.
- **Label untrusted text in responses.** Any free-text field that came from
  outside the app goes under an `untrusted` object, truncated (for example
  to 2 KB) and stripped of control characters.
- **Teach the agent the rule.** The ops skill says plainly that `untrusted`
  content is data to summarize, never instructions to follow.
- **Limit the damage if the agent is fooled.**
  - The agent holds only an ops token and a GitHub token that can push
    branches and open PRs and issues.
  - Branch protection requires human review.
  - CI on agent PRs runs without deploy secrets.

### Logs

Extend `node-log` with a production store (`node-log-db`):

- **Row:** `ts`, `level`, `service`, `templateHash`, `message` (redacted,
  truncated), `fields` (JSON of allowed keys only), `requestId`,
  `deployVersion`.
- **Templates:** normalize each message by replacing numbers, IDs, UUIDs,
  hashes and quoted values with placeholders, then hash the result. A
  `templates` table holds `firstSeen`, `lastSeen` and counts per period.
  **New templates** are the "interesting new behavior" signal.
- **Search:** FTS5 on the message text.
- **Retention:** 14 days by default, with a size cap. Rotation reuses the
  `audit-rotator` pattern.
- **Dev:** the existing ring buffer stays, and the dev routes keep working.

### Issues (errors *and* warnings)

Extend the `errors` suite with a SQLite `ErrorService` (`errors-db`). The
in-memory and Sentry backends stay as alternatives. Generalize from "errors"
to **issues with levels**:

- **Levels:**
  - `warn`, for example rate limits hit, retries exhausted, slow queries over
    budget, or degraded fallbacks.
  - `error`.
  - `fatal`, for crashes and unhandled rejections.
- **Fingerprint:**
  - Issues with a stack: error name plus the top N stack frames from the
    product's own code, with paths and line numbers normalized.
  - Issues without a stack (most warnings): service plus message template.
  - Code can pass an explicit `fingerprint` to override either.
- **Group row:** `level`, `title`, `firstSeen`, `lastSeen`, `count`,
  `firstSeenVersion`, `lastSeenVersion`, `status`, `statusNote`,
  `resolvedInVersion`, `ignoredUntil`.
- **Status:** `open` → `resolved` / `ignored(until?)`. A new occurrence after
  `resolved` makes the issue `regressed`.
- **Occurrences:** keep the last N samples per group (redacted, with the
  request ID so the matching logs can be pulled).
- **Client errors and CSP:** ingestion stays as it is now. Add size caps and
  rate limits, and resolve browser stacks against source maps kept inside the
  container (not publicly served).
- **Metrics:** export `saf_issue_occurrences_total{level}` and
  `saf_issue_new_groups_total{level}` so Prometheus can alert on issues too.

### Metrics (Prometheus)

Run real Prometheus, one per host, in the platform compose file:

- Prometheus scrapes app containers and node_exporter over the internal
  network. It is never exposed publicly.
- **Scrape interval: 60s.** We'd rather have fine histogram buckets than fine
  time resolution. Consequences:
  - `rate()` and `increase()` windows must be at least `[4m]`; the standard
    queries use `[5m]`.
  - Alert `for:` durations should be at least 2–3 minutes.
- Retention: 30 days, with a size cap. Phase 0 measured about 95 MiB of RAM
  for Prometheus at 16k series.
- **Disk estimate:** at 16k series and 15s, about 120 MB/day. At 60s, with
  the histogram series roughly 1.7x larger from finer buckets, it's about
  45 MB/day, or around 1.4 GB for 30 days.
- Alertmanager (around 30 MB) and node_exporter (around 15 MB) run alongside.
  cAdvisor is skipped unless container-level metrics prove necessary (it's the
  heaviest exporter).

**Histograms.**

- saflib defines standard bucket sets and makes sure the built-in subsystems
  record them:
  - HTTP request duration by route template and status class
  - DB query duration (via `drizzle` `queryWrapper`)
  - Job and cron duration
  - Outbound integration call duration
  - Email send duration
- **Finer buckets than today.** Phase 0 found that the current
  `[0.003, 0.03, 0.1, 0.3, 1.5, 10]` makes p95 meaningless.
  - Latency histograms use about 12 buckets, roughly 1-2.5-5 steps:
    `0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30`.
  - Pay for them by grouping `status_code` into classes (2xx/3xx/4xx/5xx).
- Use classic histograms (what `prom-client` supports).
- The ops skill documents the standard queries, for example
  `histogram_quantile(0.95, sum by (le, route) (rate(http_request_duration_seconds_bucket[5m])))`.

**Querying.** The app proxies `query`, `query_range` and `series` to
Prometheus behind the ops token, with a timeout, a cap on samples or series,
and a maximum range. Prometheus's admin APIs stay off. The agent can run any
read-only PromQL.

**Graphs.** Prometheus can't render images. Options, to be settled in
Phase 0:

1. **Signed GET, rendered on the fly (preferred).**
   `GET /ops/metrics/graph.{svg,png}?q=…&start=…&end=…&kind=line|heatmap&w&h&kid=…&sig=…`
   - **Why signed:** `<img>` tags (GitHub, Slack, email) can't send a bearer
     token, so the URL itself must be the credential. That's safe as long as
     it can only ever show one specific graph.
   - **Minting a link.**
     - `POST /ops/metrics/graph-links {queries, start, end, kind, size}`
       (requires `ops:read`) returns the signed URL. Nothing is stored at
       this point.
     - `sig` is an HMAC over the canonical parameters. Changing any
       parameter (another query, a wider range) breaks the signature, so a
       leaked link reveals exactly one graph.
     - `start` and `end` are absolute. Relative ranges like "last 24h" are
       resolved when the link is minted, so the graph is reproducible.
   - **Rendering.**
     - The app verifies the signature, runs the query through the same
       proxy limits, and renders.
     - SVG works for GitHub; PNG is needed for Slack, which won't preview
       SVG. Rendering could use Vega-Lite plus `resvg-js`, or similar.
     - Heatmaps of histogram buckets give the latency picture.
   - **Caching:**
     - Responses are cacheable (`Cache-Control: public, immutable`), keyed by
       the signature. GitHub's image proxy caches them too.
     - On first render the image is also saved to `object-store`, so the
       graph still renders after Prometheus retention has dropped the data,
       and old PRs keep their pictures.
   - **Revoking:** rotate the signing key (`kid`). Optionally add `exp` if
     links should expire. Rate limit the endpoint per IP.
   - **Fallback:** if signed GETs turn out to be awkward,
     `POST /ops/metrics/snapshots` renders once and returns a stored,
     unguessable URL.
2. **Mermaid `xychart-beta` in PR and issue bodies.** Needs no
   infrastructure. Good for simple line charts if GitHub renders it (to
   verify).
3. **Prometheus `/graph` deep links**, with the query encoded in the URL. Only
   works for viewers with network access (Tailscale). Handy for the human,
   useless in Slack.

**Deploy markers:** `saf_build_info{version,sha} 1`, so graphs can show when
each deploy landed.

### Alerting

**Prometheus rules feed Alertmanager.** saflib ships a default rule set that
products can extend or override:

- **Reliability:**
  - 5xx rate above threshold
  - Scrape target down
  - Process restarts
  - Event loop lag
  - New `fatal` or `error` issue groups
  - Regressions
  - Rate of dead jobs
- **Performance:** p95 latency over budget per route; DB query p95 over
  budget.
- **Capacity:**
  - Disk used above 80%
  - `predict_linear` says the disk fills within 3 days
  - Memory pressure
  - Telemetry queue dropping entries
  - Telemetry store over its size cap
- **Data safety:** backup older than its threshold; audit rotation stale (an
  existing check, exported as a metric).
- **Security:**
  - Spikes in failed logins or rate-limit hits (from audit and issue metrics)
  - Privilege changes outside the normal pattern
- **Certificates and domains:** TLS cert expiry under 14 days.

**Delivery.**

- Alertmanager routes to Slack (webhook) and email (SMTP), grouped and
  de-duplicated with repeat intervals.
- It also posts every alert to `/ops/alerts/webhook` (authenticated), so
  alerts show up in `GET /ops/alerts` and in the digest.

**When the host itself dies.**

- An always-firing `Watchdog` alert pings an external heartbeat service
  (healthchecks.io-style). If the pings stop, the external service alerts.
  This covers a dead droplet, a dead Prometheus, and a full disk that killed
  everything.
- Separately, an external uptime check hits each site and `/ops/health`.

**Waking the agent.** The starting workflow is manual: Slack or email says
something is wrong, and the human points the agent at the product. Stretch
goal (Phase 9): `/ops/alerts/webhook` optionally forwards selected alerts to
an agent trigger (GitHub `repository_dispatch` or a scheduled-agent trigger
URL), rate limited, with the alert ID as the only payload.

### Audit

The existing `audit` suite stays the source of truth: hash-chained, sealed,
and rotated, so read access can't tamper with it.

- `GET /ops/audit` returns redacted projections. Actors appear as stable
  pseudonymous IDs, never emails.
- `GET /ops/audit/summary` returns:
  - counts per event type compared with the previous period
  - event types never seen before
  - actors with unusual volume
  - failed-auth and rate-limit clusters
  - privilege and permission changes
  - admin actions
  - ops token creation and use

That's enough for an agent to investigate suspicious activity and write up
what it found.

### Dependencies

Renovate already does the hard part of opening update PRs, and it supports
the policy we want:

- `minimumReleaseAge` (for example 3 days) holds back fresh releases.
- `vulnerabilityAlerts` bypasses that delay for security fixes.
- It also handles Docker image tags in compose files (Kratos, Caddy base
  images).

So **Renovate keeps opening the update PRs**. The app adds what Renovate
can't see: **what's actually deployed**.

- **Build manifest.** At image build, write `ops-manifest.json` into the
  image: git SHA, build time, Node version, base image digest, and every
  resolved package from the lockfile (name, version, direct or transitive).
- **Daily check.** A cron job (`saflib/cron`) queries the npm registry for the
  latest versions and their publish dates, and OSV.dev for advisories against
  the deployed set. Results are cached in SQLite.
- **`GET /ops/dependencies`** returns:
  - deployed version, latest version, and age of the latest release
  - advisories, with severity and the fixed-in version
  - an `actionable` flag: either "the latest version is older than the
    minimum age", or "fixes an advisory at or above high severity"
- **Agent's role:**
  - Fix Renovate PRs that fail CI.
  - Handle advisories Renovate can't fix, such as a transitive dependency
    with no upstream fix (use `overrides`) or a needed major-version bump.
  - Flag when `main` has the fix but production doesn't yet.

### Other health signals

`GET /ops/health` aggregates checks. Each failing check also appears in the
digest:

- DB reachable; WAL size sane
- Disk free (from the app's view, which duplicates node_exporter on purpose)
- Backup age and last restore-test result (`backup` suite)
- Audit rotation fresh (existing watchdog)
- Dead or stuck jobs and failing cron schedules (`jobs`, `cron`)
- Email send failures and bounces (`email`)
- Outbound integration error rates
- TLS cert days remaining (handshake against the product's own domains)
- Telemetry queue drops and store sizes
- Ops tokens nearing expiry
- Deployed version vs `main` (how far behind)

### Digest

`GET /ops/digest?since=` is the agent's cheap first call. If the digest is
empty, the run ends. Sections:

- New and regressed issues; top issues by count delta
- New log templates, with counts and a sample
- Alerts fired and resolved
- Error rate and p95 latency compared with the previous period (from
  Prometheus)
- Audit anomalies
- Actionable dependencies
- Failing health checks
- Deploys in the window

Each item has a stable ID and a link to its detail endpoint. The digest
starts in Phase 3 (issues and logs only), and each later phase adds its
section.

### Portability: vendors and OpenTelemetry

Built-in telemetry is the default, not a trap. Moving a product to Sentry,
Grafana Cloud or an OpenTelemetry (OTel) pipeline should mean changing
configuration, not rewriting code.

- **Call sites use only SAF reporters.** Application code calls
  `getSafReporters().log` / `logError` / a warning helper, `prom-client`
  metrics, and the audit recorder. Nothing outside the stores imports
  `node-log-db` or `errors-db` directly.
- **Stores are sinks, and several can run at once.** The local SQLite stores
  are one Winston transport and one `ErrorService`. A vendor sink
  (`vendors/sentry-*`, `vendors/loki`) can run alongside them. Migrating then
  looks like: dual-write, compare, and turn off local only if you want to.
- **The ops API has to keep working when a product moves to a vendor.** Either:
  - keep the local stores dual-writing (cheap, and the simplest default), or
  - give `/ops/issues` and `/ops/logs` an adapter interface so they can
    proxy to the vendor's API.

  Settle this when the first product actually migrates.
- **Metrics are already standard.** Prometheus exposition format works with
  Grafana Cloud (remote write or Alloy scraping). Rules and alerts carry over
  to Grafana or Mimir.
- **Use OTel names from day one.**
  - Resource fields: `service.name`, `service.version`,
    `deployment.environment`.
  - HTTP fields: `http.route`, `http.request.method`,
    `http.response.status_code`.
  - Error fields: `exception.type`, `exception.message`,
    `exception.stacktrace`.
  - Metric names follow OTel's Prometheus translation, for example
    `http_server_request_duration_seconds` (histogram) rather than an ad-hoc
    name.
- **Leave room for traces.**
  - Log rows and issue occurrences get nullable `traceId` and `spanId`
    columns now.
  - Request IDs are propagated and accepted via the W3C `traceparent`
    header, so adding tracing later fills those columns without a
    migration.
- **OTel adoption is a separate, later project.** In outline, it means:
  - Swap `prom-client` for the OTel metrics SDK with a Prometheus exporter,
    or OTLP into Prometheus's OTLP receiver.
  - Add an OTel log bridge from Winston.
  - Add tracing at the existing wrapper boundaries (`createHandler`,
    `queryWrapper`).

  None of it blocks or is blocked by this plan, as long as the naming above
  is followed.

### Agent side

- **`ops-cli`** (`saf-ops`): `digest`, `issues`, `logs`, `promql`, `graph`,
  `deps`. It reads a product list and tokens from config, so the agent works
  the same across products. Tokens live in 1Password, and a 1Password service
  account injects them in CI.
- **An ops skill/doc in saflib:**
  - The triage loop: digest, then drill down, then decide (issue, PR, or
    resolve/ignore).
  - Standard PromQL queries.
  - How to attach graphs.
  - The untrusted-content rule.
  - Use GitHub issues as memory: one labeled issue per finding, keyed by
    fingerprint, so a finding is never reported twice.
  - Limit output, for example at most 2 PRs per repo per run, with the rest
    in a digest issue.
- **GitHub is a second data source.** The ops API covers the running app.
  CI lives on GitHub, so each run also reads, through the GitHub API:
  - recent workflow runs and failed job logs on `main` and on open PRs
  - Renovate PRs and their check status
  - Dependabot and code-scanning alerts
  - PRs opened by allowlisted authors

  Bringing repo and CI hosting in-house to centralize everything is a
  separate project and out of scope.
- **The maintenance agent's access is exactly this, and nothing else (for
  now):**
  - **Telemetry:** an ops token with `ops:read` + `ops:triage`.
  - **GitHub, read:** contents, Actions runs and logs, PRs, issues, security
    alerts.
  - **GitHub, write:** push non-protected branches, open PRs, open and
    comment on issues.
  - **Not granted:** merge, deploy secrets, SSH, 1Password vault access, DB
    access, repo or org settings.
- **Scheduled run:** daily per product, in an ephemeral environment.
- **Branch protection** on `main` in every product repo requires human
  review.

## Phases

### Phase 0: Spikes

- [x] Local footprint baseline (2026-11-08). Prometheus v3.5 + Alertmanager
      + node_exporter in Docker, scraping 4 synthetic SAF-shaped apps
      (`prom-client` defaults, plus an express-prom-bundle-shaped histogram
      across 120 routes) at 15s:
      - About 16k head series in total: 13.3k from the apps, 1.4k from
        node_exporter, 0.6k from Prometheus itself.
      - Memory: Prometheus about 80 MiB (cgroup; process RSS about 140 MB),
        Alertmanager about 19 MiB, node_exporter about 12 MiB. CPU under 1%.
      - Disk is extrapolated, not measured (assuming about 1.3 bytes per
        sample): roughly 120 MB/day at 16k series and 15s, so about 3.5 GB
        for 30 days. A 30s scrape interval or fewer histogram series halves
        it. Keep `retention.size` as a backstop.
      - The real hub will have fewer series (only routes that actually get
        hit).
- [x] Local re-check after about 45 minutes: Prometheus 95 MiB,
      Alertmanager 21 MiB, node_exporter 15 MiB.
- [ ] ~~Run on the hub droplet for 48 hours~~ → moved to Phase 5, measured
      as part of the real deploy.
- [x] Prototype rendering a PromQL `query_range` result to SVG and PNG (line
      and heatmap). Pick a library. (2026-11-08)
      - **Library:** Vega-Lite to Vega `toSVG()` (headless, no canvas), then
        `@resvg/resvg-js` for PNG. Dependencies add about 41 MB to
        node_modules, including a 3.4 MB native resvg binary per platform.
        This is acceptable for an optional `ops-graphs` package.
        Alternative: a small hand-rolled SVG renderer if the dependency
        weight matters.
      - **Speed:** query about 20–40 ms, SVG about 10–30 ms, PNG about
        150 ms (2x scale).
      - **Fonts:** the first PNG took about 1.4 s while loading system fonts.
        Production images are `node:24-slim` and have *no* system fonts, so
        bundle one font file, pass it via `fontFiles`, and turn off
        `loadSystemFonts`.
      - **Signed GET:** the prototype server minted HMAC-signed URLs over
        `q, start, end, kind, w, h, title`. Changing the query or widening
        the range returns 403. Responses are `immutable`-cacheable.
      - **Heatmap:** de-cumulate the `le` buckets per timestamp, draw a rect
        per step (`x`/`x2`), and use an ordinal latency axis.
      - **Polish for later:** render the time axis in UTC and label it, and
        cap the number of series shown in the legend.
      - **Finding: SAF's default histogram buckets are too coarse for p95.**
        `metricHistogramDefaultBuckets` /
        express-prom-bundle use `[0.003, 0.03, 0.1, 0.3, 1.5, 10]`.
        `histogram_quantile` interpolates linearly inside the 0.3–1.5 bucket,
        so p95 drew as a flat, meaningless line at about 1.35 s. Phase 5
        should switch to finer buckets (for example Prometheus's defaults,
        0.005–10 in 11 steps). To pay for the extra buckets, group
        `status_code` into classes (2xx/4xx/5xx).
- [ ] ~~Embed tests (signed-GET image in GitHub and Slack; Mermaid
      `xychart-beta`)~~ → moved to Phase 5. They need a public URL.
- [x] `/ops` reachability: public behind the token and rate limits.
      Tailscale covers the monitoring UIs, cross-host scraping, and
      optionally SSH (see *The ops API*).

### Phase 1: Ops token, health, manifest

**Design notes (2026-11-08):**

- **Machine security schemes in `@saflib/express`.**
  - Today every authenticated requirement must include `session`.
    `SecurityResolver` gains `standalone: true` for credential schemes that
    authenticate on their own.
  - A requirement is either `session` (plus optional companion schemes) or
    exactly one standalone scheme. Never both.
  - CSRF skips operations whose requirement has no `session`, since there's
    no cookie to protect.
  - The global session gate defers `/ops/*` via `deferAuth`, so the
    operation's own `security` decides.
- **Token format and storage.**
  - Format: `safops_` + 32 random bytes in base64url.
  - Stored as SHA-256. That's enough for high-entropy random tokens; no
    password KDF is needed.
  - The first 8 characters after the prefix are kept for display.
  - Fields: name, scopes (JSON), `created_by`, `expires_at`, `last_used_at`
    (throttled updates), `revoked_at`.
  - The DB is its own SQLite file (`ops-db`, the same pattern as `cron-db`),
    so the product compose needs one more volume.
- **Admin routes** live at `/admin/ops-tokens` (session `site-admin`), so
  they're outside the deferred `/ops/*` prefix.
- **Rate limit:** an in-memory fixed window per token (and per IP for failed
  auth). One process per color, so in-memory is enough.

Slices:

- [x] **1a.** Machine schemes in express (standalone resolvers, CSRF,
      tests); `ops-db` (token table and queries); `ops-spec`; `ops-http`
      (token resolver, rate limit, `/ops/health` with disk, DB and process
      checks, admin token routes); mounted in the base http-app
      (`base-ops`, `deferAuth`, Caddy `/ops/*` matcher, audit entries for
      token create/revoke). Done 2026-11-08.
- [x] **1b.** Build manifest written at image build; `GET /ops/deploys`;
      `saf_build_info`. Done 2026-11-08. The manifest already existed
      (`/etc/saf/build.json` from `saf-docker build`). Each process start is
      recorded as a boot; boots with a changed build are deploys. The full
      lockfile resolution is left for Phase 8.
- [ ] **1c.** Health checks from existing suites (audit rotation, dead jobs,
      backup age); audit-log ops calls
- [ ] **1d.** Admin UI page for tokens; CLI to mint and revoke tokens
- [ ] **1e.** Wire into hub: volume mount, Caddy unchanged (forward-auth
      doesn't block); deploy

### Phase 2: Persistent logs

- [ ] Redaction format (key names, value patterns, URL stripping, IP
      truncation) that masks values and raises `log.redaction:<kind>` warn
      issues, plus tests. The issues land once Phase 3 exists; until then,
      count detections in a metric.
- [ ] `node-log-db`: store, batched writer, overflow counter, rotation and
      size cap, FTS5
- [ ] Template normalization and the `templates` table
- [ ] `GET /ops/logs`, `GET /ops/logs/templates`; the admin log page works in
      production

### Phase 3: Issues and first digest

- [ ] `errors-db` SQLite `ErrorService` with levels, fingerprints, groups,
      occurrences, status transitions and regression detection
- [ ] Route `warn` calls into issues (opt-in helper such as `reportWarning`,
      plus automatic for rate-limit and retry-exhausted paths in saflib)
- [ ] Server-side source map resolution for client errors
- [ ] Issue endpoints, including resolve/ignore/reopen (`ops:triage`)
- [ ] Issue metrics exported to `prom-client`
- [ ] `GET /ops/digest` v1 (issues and logs)

### Phase 4: Agent trial

- [ ] `ops-cli` with `digest`, `issues` and `logs`
- [ ] Ops skill/doc
- [ ] Branch protection on one production product, plus a GitHub token
      scoped exactly as in *Agent side*
- [ ] Agent reads recent workflow runs, Renovate PRs and security alerts
      from GitHub alongside the ops digest
- [ ] Daily scheduled agent against that product. Review triage quality for
      two weeks before widening scope.

### Phase 5: Prometheus

- [ ] Per-host Prometheus and node_exporter in the platform compose
      (`hub/deploy`), with a 60s scrape interval, retention and size cap.
      Record RAM, CPU and disk after 48 hours (carried over from Phase 0).
- [ ] Tailscale on the hosts; Prometheus and Alertmanager UIs reachable on
      the tailnet only; optionally move SSH and deploys onto the tailnet
- [ ] Embed tests (carried over from Phase 0): a signed-GET graph in a
      GitHub PR body and in Slack; Mermaid `xychart-beta` on GitHub
- [ ] Standard histogram bucket sets (finer latency buckets, status
      classes), with saflib subsystems instrumented
- [ ] `/ops/metrics/*` proxy with limits
- [ ] Graph links: signed-GET rendering with lazy `object-store` caching
      (or the POST snapshot fallback, per Phase 0); `saf-ops graph`
- [ ] Digest gains error-rate and p95 comparisons

### Phase 6: Alerting

- [ ] Default rule set (above), overridable per product
- [ ] Alertmanager routes to Slack and email
- [ ] Watchdog to an external heartbeat; external uptime checks per site and
      for `/ops/health`
- [ ] `/ops/alerts/webhook`, `GET /ops/alerts`, ack; digest section

### Phase 7: Audit

- [ ] `GET /ops/audit` redacted projections
- [ ] `GET /ops/audit/summary` and its digest section
- [ ] Security alert rules fed by audit metrics

### Phase 8: Dependencies

- [ ] Manifest contains the full lockfile resolution
- [ ] Daily npm registry and OSV check job; `GET /ops/dependencies`; digest
      section
- [ ] Renovate config across repos: `minimumReleaseAge`,
      `vulnerabilityAlerts`, Docker tags in compose files

### Phase 9: Rollout and alert-driven wake

- [ ] All products on the ops API; the agent's product list covers them all
- [ ] (Stretch) Alertmanager webhook forwards selected alerts to an agent
      trigger

## Open questions

- Should Prometheus and Alertmanager config live in saflib (shared defaults
  with per-product overlays) or in each product's deploy directory?
- When several products share a droplet, do they share one Prometheus, with
  per-product label filtering enforced by the proxy?
- Where does `/ops` live for client-only deploys (blog, resume), if anywhere?
  Probably just external uptime checks, plus dependency status reported from
  CI.
- Should graph links be permanent (revocable only by rotating the signing
  key), or carry an `exp`?
- When should Prometheus and Alertmanager move to their own machine? The
  design supports it either way; decide based on Phase 0 footprint and how
  much we want monitoring to survive an app-host failure.
- Should prod make the npm registry and OSV calls, or should they run in CI
  with results pushed to the app?

## Decisions log

- **2026-11-07:** Prometheus is run for real rather than replaced, for PromQL,
  histograms and alerting. Loki, Sentry and PostHog are replaced by
  in-app SQLite stores (logs, issues), and product analytics is out of scope.
- **2026-11-07:** Telemetry is per product, not centralized, to limit how much
  any one breach exposes.
- **2026-11-07:** Agents get a scoped ops token and a PR-only GitHub token.
  Humans merge. Issue status changes (resolve/ignore) are the only writes the
  agent can make through the ops API.
- **2026-11-07:** Renovate keeps opening the update PRs. The app reports
  deployed versions and advisories.
- **2026-11-07:** Built-in stores are sinks behind the existing SAF
  abstractions, so vendors can run alongside them or replace them. Field and
  metric names follow OTel conventions, and `traceId`/`spanId` slots are
  reserved, so adopting OTel later is a separate project that needs no data
  migration.
- **2026-11-08:** Redaction masks the matched value but still writes the
  line, and raises a `log.redaction:<kind>` warn issue so the leaking log
  call gets fixed. The rule is identifiers, not identities.
- **2026-11-08:** Graphs are signed GET URLs rendered on the fly and lazily
  cached to `object-store`, so they can be embedded in PRs, Slack and email.
  A POST that stores a snapshot is the fallback.
- **2026-11-08:** The maintenance agent gets read access to GitHub (including
  Actions), can open PRs and issues, and has the ops token, and nothing else.
  Self-hosting repo and CI is out of scope.
- **2026-11-08:** Monitoring (Prometheus and Alertmanager) is designed to run
  on the app host or a separate machine via configured URLs; when to split is
  decided later.
- **2026-11-08:** Phase 0 done. Vega-Lite + resvg for graphs, with signed
  GETs confirmed. Prometheus scrapes every 60s, trading time resolution for
  finer histogram buckets (about 12 latency buckets, status classes).
  `/ops` is public behind the token. Tailscale is in scope for monitoring
  UIs, cross-host scraping and (optionally) SSH.
