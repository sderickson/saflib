# Workflows Rewrite — Spec

Status: draft, not yet scoped into a phased implementation plan.

## Why

`@saflib/workflows` today is XState-based (step defs compile to nested state
machines, see `workflows/core/xstate.ts`, `workflows/docs/01-overview.md`).
In practice we never needed most of what a state machine buys us — a
workflow is a linear (occasionally branching) list of steps, some of which
are other workflows. What we actually want, and don't have, is:

- A standard, accessible data model for run state: a normal sqlite schema
  instead of a nested XState snapshot. This is about the shape of the
  state being simple and queryable, not about concurrency — a given
  workflow run is still driven by exactly one process at a time, the same
  as today.
- Workflows definable purely as **config**, with no TypeScript, for one-off
  work — while the reusable "platform" workflows (add a route, add a page,
  ...) stay defined in code as they are now.
- A client-agnostic core: the engine exposes its output as streams instead
  of calling `console.log` directly (today's engine does the latter, see
  `workflows/core/prompt.ts`, `workflows/core/utils.ts`), so piping — e.g.
  a running command's output straight through to a client — is trivial
  instead of something bolted on after the fact.
- A first-class `dev-site` experience: author a workflow (or have an agent
  author one), preview its effect on the current codebase as a *proposed*
  diff before touching the filesystem, iterate, then run it with the
  ability to watch progress, pause, and inject prompts — mirroring the
  commit-diffing UX `dev-site-http`/`dev-site-vue` already have
  (`dev-site/dev-site-http/diff-commits.ts`,
  `dev-site/dev-site-vue/package-compare.ts`), but for a plan that hasn't
  been applied yet.

This doc specs the rewrite only — the foundational package suite and the
behaviors it must support on day one. A separate follow-up backlog
(bottom of this doc) lists features that depend on this foundation but are
explicitly out of scope for the initial cut.

## Non-goals for the rewrite itself

- Porting every existing workflow on day one. Old and new run side by side
  until the new engine has proven itself on real work.
- Ink-based CLI. The engine must not make this hard later, but building it
  now is not part of this rewrite.
- Multi-process/concurrent execution of a single run. One process drives a
  run at a time, same as today — the db is for a clean data model, not for
  distributed execution.
- Any of the "future features" listed at the bottom.

## Package layout

Following the family-folder convention already used by `cron/`, `jobs/`,
`dev-site/` (each a directory containing sibling packages), but without
repeating the family name inside each package's path:

```
new-workflows/
  plans/     # this doc and future planning docs
  db/        # @saflib/new-workflows-db   — sqlite schema + drizzle queries
  lib/       # @saflib/new-workflows      — engine, step primitives, agent adapters
  spec/      # @saflib/new-workflows-spec — OpenAPI spec (http surface + SSE event shapes)
  http/      # @saflib/new-workflows-http — thin express wrapper over lib, using @saflib/notify
  cli/       # @saflib/new-workflows-cli  — thin CLI wrapper over lib
```

npm package names still follow the existing `<family>-db` / `<family>-http`
/ `<family>-spec` / `<family>-cli` convention (matching `jobs-db`,
`jobs-http`, `jobs-spec`, ...) so that the eventual rename (see below) is a
pure find/replace from `new-workflows*` to `workflows*` with no further
restructuring.

Once this is integrated into `dev-site` and has replaced enough of the old
surface to be trustworthy, the `new-workflows/` folder and its packages
drop the `new-` prefix (folder becomes `workflows/`, packages become
`@saflib/workflows`, `@saflib/workflows-db`, etc.) and the old `workflows`
/ `workflows-cli` / `xstate` packages are deleted. `@saflib/xstate`'s own
docs already flag it as likely to shrink or disappear once workflows drop
XState — this rewrite is that trigger.

### `db`

Drizzle/sqlite schema, modeled on `jobs-db` / `dev-site-db`. Rough shape:

- `workflow_configs` — one-off, config-defined workflows (id, name, the
  config body as JSON, created_by, timestamps). Code-defined workflows
  (the platform ones) are **not** rows here — they're registered by the
  process that imports them, same as today's `defineWorkflow` exports.
- `workflow_runs` — one row per execution: which workflow (code id or
  `workflow_configs` row), input, status (`pending` / `running` /
  `awaiting_prompt` / `awaiting_user` / `done` / `failed`), current step
  index, cwd, agent config, timestamps.
- `workflow_steps` — one row per step attempt within a run: step index,
  step kind, status, result/error, started_at/finished_at. Lets a run be
  resumed mid-step-list and gives an audit trail independent of logs.
- `workflow_logs` — append-only: run_id, step index (nullable), channel
  (see below), level, content, created_at. This is the thing both the CLI
  and HTTP surface read/write.

### `lib`

Everything that isn't storage or transport:

- `defineWorkflow` — same spirit as today's, but:
  - `input` becomes a plain TS object/type instead of the
    `WorkflowArgument[]` array (see backlog item "typed inputs" below —
    actually needed on day one since it changes the definition shape;
    listed here rather than the backlog).
  - Steps remain the existing primitive kinds (copy, update, prompt,
    command, cd, npm-script, transform-file) reimplemented as plain async
    functions against `WorkflowContext`, instead of XState actors. No step
    *behavior* changes in the rewrite — this is a mechanical port off
    XState, not a redesign of what steps do.
- **A single "run the next step" entry point — nothing more.** Given a run
  id, lib loads that run's persisted state from `db`, executes exactly one
  step, writes the step/log rows for it, and returns a result describing
  what happened (`success` / `error` / `awaiting_prompt` / `awaiting_user`
  / `done`, plus whatever detail is relevant). It never decides to keep
  going on its own and there is no "continue" call for it to expose —
  looping over steps, deciding whether to stop after an inserted prompt,
  retrying after an error, etc. is entirely the caller's job (CLI or
  dev-site). This keeps control flow in exactly one place — the client —
  instead of splitting it between lib and caller.
- Agent adapters: `cursor-agent` (ported as-is) and a new `claude-agent`
  (Claude Code CLI, mirroring how `cursor-agent.ts` drives the Cursor CLI
  today) plus the existing `mock-agent` for tests.
- Config-defined workflow support: a schema for a `workflow_configs` row
  that maps to the same step primitives lib understands (copy/update/
  command/prompt/etc.), so one-off workflows are just data. Validation of
  this schema lives here.
- Streaming output: no `console.log`/`print()` calls anywhere in the lib
  (`workflows/core/utils.ts:print` and friends go away in the new engine).
  Every step's output is exposed as a stream (see below) that the caller
  (CLI or HTTP layer) reads from — not a callback the lib invokes, so a
  consumer can pipe a running command's stdout straight through without
  the lib knowing or caring who's on the other end.

### `spec`

OpenAPI spec, generated docs, following `jobs-spec`/`dev-site-spec`
conventions:

- `GET /workflows` — list registered code workflows + `workflow_configs`.
- `POST /workflows/:id/runs` — start a run.
- `GET /runs/:runId` — run state (status, current step, input).
- `POST /runs/:runId/advance` — run the next step (this is the HTTP face
  of lib's single entry point; the client decides whether/when to call it
  again).
- `GET /runs/:runId/logs?since=` — paginated log read, cursor-based.
- `POST /runs/:runId/prompt` — insert a prompt for the next `advance` call
  to use.
- Event schema for the SSE channel (see notify integration below):
  something coarse like `{ run_id, kind: "log" | "status" }`, per
  `@saflib/notify`'s existing pattern of hints-not-payloads
  (`notify/docs/01-overview.md`) — the frontend re-fetches
  `/runs/:runId/logs` on the hint rather than getting log content pushed
  inline.

### `http`

Thin wrapper over `lib`, in the same shape as `jobs-http`: express router
implementing the spec's operations, backed by `db` queries and `lib`
calls. Every write path here does two things: persists to `db` and
publishes a change hint via `@saflib/notify`'s `InProcessChangeEmitter`,
keyed by run id, so an SSE route can replay/stream to the `dev-site-vue`
frontend the same way `node-log-http`'s `stream-dev-logs.ts` already
streams winston logs. `http` is the thing responsible for turning `lib`'s
per-step output stream into persisted log rows plus a notify hint — `lib`
itself never writes to the db or publishes anything itself except through
what it returns/streams from a single `advance` call.

### `cli`

Thin wrapper over `lib`, in the same shape as today's `workflows-cli`:
maps CLI args to a workflow's typed input object (replacing the current
`WorkflowArgument[]`-driven arg parsing), calls `lib`'s "run next step"
entry point in a loop it owns, and both persists each step's output to
`db` and renders it live to the terminal by consuming the same output
stream `lib` exposes.

## State model

A run is a row in `workflow_runs` plus its `workflow_steps` children. No
in-memory snapshot is the source of truth — the db row is. Because `lib`
only ever runs one step per call and reports the outcome, resuming a run
(from the CLI restarting, or a fresh HTTP request) is just: load the run
row, call "run next step" again. Pausing for a user-prompt step or
stopping after an inserted prompt is a matter of the *caller* not calling
"run next step" again yet, not something the state machine needs to model.

## Output streams

Every step's output is exposed as a stream (not a callback the lib
invokes) tagged with a channel, so a consumer can pipe it — e.g. a running
command's stdout straight to a terminal or an HTTP response — without lib
needing to know what's downstream:

| Channel        | What it is                                                          |
| -------------- | -------------------------------------------------------------------- |
| `terminal`     | Raw stdout/stderr from a subprocess the workflow ran (vite, npm, git) |
| `agent`        | Output *from* the coding agent (what it said, what it executed)      |
| `tool`         | The workflow engine's own narration ("running step 3: copy", etc.)   |
| `agent-input`  | The prompt text sent *to* the agent, whether generated by the tool or supplied by the user |

Each chunk read off the stream carries its channel tag. `cli` reads the
stream directly and both formats/prints it per-channel (color/prefix per
channel, matching today's `print()`/`printPrompt()` look-and-feel in
`workflows/core/agents/print.ts` and `workflows/core/prompt.ts`) and writes
it to `db` as it goes. `http`'s `advance` handler reads the same stream,
writes it to `db`, and publishes a notify hint — it does not forward
chunks to the client inline; the SSE hint tells the frontend to re-fetch
`/runs/:runId/logs`.

## Templating / filesystem

The rewrite keeps today's copy/update step behavior and the **workflow
area** marker system as-is (`BEGIN WORKFLOW AREA <name> FOR <ids> ...END
WORKFLOW AREA`, `workflows/core/steps/copy/inline/*`) — no changes to that
syntax or semantics in this rewrite. What changes is only the execution
model around it (plain functions instead of XState actors) and, per the
backlog below, eventually making the copy/update application itself
filesystem-optional so `dev-site` can preview a plan without writing to
disk. That filesystem-optional work is explicitly a backlog item, not part
of the initial rewrite — the initial rewrite runs copy/update steps
against the real filesystem exactly like today.

## Client model

Two clients on day one, both built on `lib`, both driving their own loop
over "run next step" — `lib` never loops or continues on its own:

1. **CLI** (`cli`) — parity with today's `saf-workflow`: `list`,
   `kickoff`, `checklist`, `dry-run`, run modes (`dry`, `script`, `print`,
   `run`, `checklist`) preserved. Loops over "run next step" itself,
   persisting to db and printing to terminal as it goes.
2. **`dev-site` (HTTP)** — `http` exposes the spec above; `dev-site-vue`
   gets a minimal viewer (list runs, tail logs, an "advance" button) as
   part of this rewrite. The fuller "author/preview/iterate" experience
   described in the backlog is a separate follow-up once this plumbing
   exists.

## Rough phasing

1. `db` schema + `lib`: port existing step kinds off XState onto plain
   functions + sqlite-backed run state, with the single "run next step"
   entry point. No config-defined workflows yet, no HTTP. Prove it by
   porting one real workflow (e.g. `workflows/add-workflow`) and driving
   it via a bare script/test that loops over "run next step" itself, not
   yet the CLI.
2. `cli`: parity CLI wrapper, dogfood on a couple of real platform
   workflows in parallel with the old CLI.
3. Config-defined one-off workflows: schema + validation + a way to
   kick one off via the CLI.
4. `spec` + `http` + notify wiring + minimal `dev-site-vue` run viewer.
5. Cutover: migrate remaining platform workflows, delete
   `workflows`/`workflows-cli`/`xstate` packages, rename `new-workflows/*`
   → `workflows/*`.

Each phase should be usable/testable on its own before starting the next;
this doc doesn't commit to a single big-bang PR.

## Backlog (depends on this rewrite, not part of it)

Captured here so scope doesn't creep into the rewrite itself. Revisit once
phase 5 lands.

1. **Orienting system prompt per workflow** — a fixed prefix (e.g. a link
   to the current project spec/plan) always inserted into the first prompt
   of a fresh agent session for a given workflow.
2. **End-of-workflow checks** — declare what should run when a workflow
   finishes (typecheck, unit tests, etc.).
3. **Full `dev-site` authoring/preview/iterate loop** — prompt an agent to
   write a workflow config, see its *proposed* effect on the current
   codebase the same way `dev-site` diffs two real commits today
   (`diff-commits.ts`), give feedback and iterate on the plan before
   applying it, then execute with the ability to follow along, pause,
   insert prompts (with the choice to stop after or keep going), and
   commit along the way.
   - **Filesystem-optional templating** — to make the "proposed changes"
     preview possible without touching disk, the copy/update application
     needs to run against in-memory blobs (from the working tree or a git
     commit, same source-agnostic approach `dev-site-http` already uses
     for git objects — `get-commit.ts`, `checkout.ts`) with the resulting
     analysis stored in the db, comparable the same way commit diffs are
     compared now. The workflow area marker system itself is unchanged by
     this — only its application target (blob vs. file) changes.
4. **User-prompt step** — a "core" step type that prompts the *human*
   (not the agent) to do something external (run a migration, review a
   plan, review a diff) and blocks until they hit continue; on the CLI
   this is text + a prompt, on `dev-site` it's an alert + a continue
   button. Composes with the pause/insert-prompt behavior in #3.
5. **Claude Code as a supported agent** — `claude-agent` adapter alongside
   `cursor-agent`/`mock-agent`. (Note: this one is small enough it may get
   pulled forward into the rewrite itself if convenient — listed here
   because it's not required for the core rewrite to be useful.)
6. **Ink-based CLI** — nicer terminal UX for `cli`. Since output is already
   exposed as a stream rather than a direct-print callback, this should be
   straightforward to add later without changing the engine.
