# Workflows Rewrite — Spec

Status: draft, not yet scoped into a phased implementation plan.

## Why

`@saflib/workflows` today is XState-based (step defs compile to nested state
machines, see `workflows/core/xstate.ts`, `workflows/docs/01-overview.md`).
In practice we never needed most of what a state machine buys us — a
workflow is a linear (occasionally branching) list of steps, some of which
are other workflows. What we actually want, and don't have, is:

- State that lives in a real store (sqlite) instead of an in-memory XState
  snapshot, so runs can be inspected, resumed, and driven from more than one
  process.
- Workflows definable purely as **config**, with no TypeScript, for one-off
  work — while the reusable "platform" workflows (add a route, add a page,
  ...) stay defined in code as they are now.
- A client-agnostic core: the engine emits structured log events over
  callbacks; today's engine is written CLI-first and mixes `console.log`
  directly into step logic (see `workflows/core/prompt.ts`,
  `workflows/core/utils.ts`).
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
- Any of the "future features" listed at the bottom.

## Package layout

Following the family-folder convention already used by `cron/`, `jobs/`,
`dev-site/` (each a directory containing `<name>`, `<name>-db`,
`<name>-http`, `<name>-spec`, `<name>-vue` as siblings):

```
new-workflows/
  plans/                    # this doc and future planning docs
  new-workflows-db/         # sqlite schema + drizzle queries
  new-workflows/            # lib: engine, step primitives, agent adapters
  new-workflows-spec/       # OpenAPI spec (http surface + SSE event shapes)
  new-workflows-http/       # thin express wrapper over lib, using @saflib/notify
  new-workflows-cli/        # thin CLI wrapper over lib
```

Once this is integrated into `dev-site` and has replaced enough of the old
surface to be trustworthy, `new-workflows*` packages get renamed to drop
the `new-` prefix and the old `workflows` / `workflows-cli` / `xstate`
packages are deleted. `@saflib/xstate`'s own docs already flag it as likely
to shrink or disappear once workflows drop XState — this rewrite is that
trigger.

### `new-workflows-db`

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

### `new-workflows` (lib)

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
- A run loop that:
  - Loads a run's persisted state (or creates one) from `new-workflows-db`.
  - Executes the next pending step, writing step/log rows as it goes.
  - Returns control after each step (or batch of steps, in `run` mode)
    rather than driving the whole workflow to completion in one call —
    this is what makes "run one step via HTTP" and "insert a prompt, then
    continue" possible later.
- Agent adapters: `cursor-agent` (ported as-is) and a new `claude-agent`
  (Claude Code CLI, mirroring how `cursor-agent.ts` drives the Cursor CLI
  today) plus the existing `mock-agent` for tests.
- Config-defined workflow support: a schema for a `workflow_configs` row
  that maps to the same step primitives lib understands (copy/update/
  command/prompt/etc.), so one-off workflows are just data. Validation of
  this schema lives here.
- Logging: no `console.log`/`print()` calls anywhere in the lib
  (`workflows/core/utils.ts:print` and friends go away in the new engine).
  Every step emits structured events through a callback interface (see
  below) that the caller (CLI or HTTP layer) supplies.

### `new-workflows-spec`

OpenAPI spec, generated docs, following `jobs-spec`/`dev-site-spec`
conventions:

- `GET /workflows` — list registered code workflows + `workflow_configs`.
- `POST /workflows/:id/runs` — start a run.
- `GET /runs/:runId` — run state (status, current step, input).
- `POST /runs/:runId/advance` — execute the next step.
- `GET /runs/:runId/logs?since=` — paginated log read, cursor-based.
- `POST /runs/:runId/prompt` — insert a prompt (with `continue: boolean`
  for whether to keep running steps afterward or stop for review).
- `POST /runs/:runId/continue` — resume after `awaiting_user`/paused state.
- Event schema for the SSE channel (see notify integration below):
  something coarse like `{ run_id, kind: "log" | "status" }`, per
  `@saflib/notify`'s existing pattern of hints-not-payloads
  (`notify/docs/01-overview.md`) — the frontend re-fetches
  `/runs/:runId/logs` on the hint rather than getting log content pushed
  inline.

### `new-workflows-http`

Thin wrapper over the lib, in the same shape as `jobs-http`: express router
implementing the spec's operations, backed by `new-workflows-db` queries
and `new-workflows` lib calls. Every write path here does two things:
persists to `new-workflows-db` and publishes a change hint via
`@saflib/notify`'s `InProcessChangeEmitter`, keyed by run id, so an SSE
route can replay/stream to the `dev-site-vue` frontend the same way
`node-log-http`'s `stream-dev-logs.ts` already streams winston logs.

### `new-workflows-cli`

Thin wrapper over the lib, in the same shape as today's `workflows-cli`:
maps CLI args to a workflow's typed input object (replacing the current
`WorkflowArgument[]`-driven arg parsing), calls the lib's run loop
step-by-step, and additionally prints logs to the terminal as they're
emitted (see channels below) — it both persists via the lib and renders
live, whereas the HTTP client only persists + notifies.

## State model

A run is a row in `workflow_runs` plus its `workflow_steps` children. No
in-memory snapshot is the source of truth — the db row is. This is what
makes "run a step over HTTP, come back later, run the next step" trivial:
the caller just loads the run row and continues. It's also what makes
pausing for a user-prompt step, or stopping after an inserted prompt, a
matter of a status value rather than something that has to fight an XState
snapshot's shape.

## Logging channels

Every emitted event is tagged with a channel so a renderer (CLI or web) can
style/route it distinctly instead of guessing from content:

| Channel        | What it is                                                          |
| -------------- | -------------------------------------------------------------------- |
| `terminal`     | Raw stdout/stderr from a subprocess the workflow ran (vite, npm, git) |
| `agent`        | Output *from* the coding agent (what it said, what it executed)      |
| `tool`         | The workflow engine's own narration ("running step 3: copy", etc.)   |
| `agent-input`  | The prompt text sent *to* the agent, whether generated by the tool or supplied by the user |

All four are just rows in `workflow_logs` distinguished by `channel`. The
lib takes a `LogSink` callback (`(entry) => void | Promise<void>`) rather
than writing anywhere itself; both the CLI and HTTP wrapper supply a sink
that writes to `new-workflows-db`, and the CLI additionally supplies one
that formats and prints to the terminal per-channel (color/prefix per
channel, matching today's `print()`/`printPrompt()` look-and-feel in
`workflows/core/agents/print.ts` and `workflows/core/prompt.ts`).

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

Two clients on day one, both built on the same lib:

1. **CLI** (`new-workflows-cli`) — parity with today's `saf-workflow`:
   `list`, `kickoff`, `checklist`, `dry-run`, run modes (`dry`, `script`,
   `print`, `run`, `checklist`) preserved. Persists to db and prints to
   terminal.
2. **`dev-site` (HTTP)** — `new-workflows-http` exposes the spec above;
   `dev-site-vue` gets a minimal viewer (list runs, tail logs) as part of
   this rewrite. The fuller "author/preview/iterate" experience described
   in the backlog is a separate follow-up once this plumbing exists.

## Rough phasing

1. `new-workflows-db` schema + `new-workflows` lib: port existing step
   kinds off XState onto plain functions + sqlite-backed run state. No
   config-defined workflows yet, no HTTP. Prove it by porting one real
   workflow (e.g. `workflows/add-workflow`) and running it via a bare
   script/test, not yet the CLI.
2. `new-workflows-cli`: parity CLI wrapper, dogfood on a couple of real
   platform workflows in parallel with the old CLI.
3. Config-defined one-off workflows: schema + validation + a way to
   kick one off via the CLI.
4. `new-workflows-spec` + `new-workflows-http` + notify wiring + minimal
   `dev-site-vue` run viewer.
5. Cutover: migrate remaining platform workflows, delete
   `workflows`/`workflows-cli`/`xstate` packages, rename `new-workflows*`
   → `workflows*`.

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
6. **Ink-based CLI** — nicer terminal UX for `new-workflows-cli`. The lib's
   `LogSink` interface should already make this straightforward to add
   later without changing the engine.
