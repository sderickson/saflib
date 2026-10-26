# Phase workflow YAML

A project folder under `<product>/plans/notes/<date>-<name>/` is a sequence of workflow files. **Play current plan** runs the next `.yaml` in alphabetical order when the current file finishes. `phase-0-plan.workflow.yaml` is already there (it calls `processes/spec-project`). Later files should be `phase-1-<slug>.workflow.yaml`, `phase-2-<slug>.workflow.yaml`, and so on.

Do **not** add a file named after the project (`<name>.workflow.yaml`). That name sorts after `phase-6` and Play current plan will start it after the last phase, which re-runs the whole project.

There is no separate plan markdown and no generated orchestrator. The phase files are the plan. Review them in the dev site (open a phase, preview, then run one phase at a time).

## One agent per phase

Each phase file runs with **a new agent session**. Every agent step in the phase, including the ones inside its `call-workflow`s, shares that one session. The next phase starts fresh and knows nothing from the previous one except what's in the repo: the spec, the earlier phase files, and the code they produced.

Size and group phases with that in mind:

- **One coherent slice of related work per phase.** For example: one resource's table and queries, its routes and handlers, or one page with its SDK queries. The steps should build on each other, so the context an agent picks up early (the files it read, the decisions it made) helps with the later steps.
- **Keep phases small.** A phase that touches unrelated areas or takes many agent steps fills the session with context the later steps don't need. That makes it slower and more expensive, and the agent gets less reliable. If a phase grows past roughly 8–10 agent steps, or spans more than one or two packages, split it.
- **Don't split tightly coupled work.** If step B can't be written well without knowing how step A turned out, keep them in the same phase.
- **Write each phase so a newcomer can run it.** Prompts should name the files and spec sections they depend on instead of saying things like "as discussed" or "the approach from phase 2". Anything a later phase must know belongs in the spec or in the code, not in an agent's memory.

## Shape

One table, schema, route, handler, query, or view per `call-workflow`. `cd` into the package first. Paths in `cd` and workflow `path` inputs are relative to the monorepo root after the run's cwd is the repo root; if a previous `cd` moved into a package, later paths are relative to that package (`./schemas/foo.ts`).

```yaml
name: Phase 1 — DB
description: Add the widget table and its queries.
steps:
  - kind: cd
    path: product/service/db

  - kind: call-workflow
    workflowId: drizzle/update-schema
    input:
      path: ./schemas/widget.ts
      prompt: >
        Create the widget table. Singular name. No ON DELETE CASCADE.

  - kind: call-workflow
    workflowId: drizzle/add-query
    input:
      path: ./queries/widget/create.ts
      prompt: Insert a widget row.
```

## Expected files

Give every `prompt` step a `files` list: the paths or globs it's expected to change, relative to the repo root (the run's starting directory, whatever earlier `cd` steps did). The list is added to the agent's prompt. `command`, `npm-script` and `call-workflow` steps can take `files` too, for what a generator writes or what a test step might need to fix.

Every step's `files` together are the phase's scope. Once a phase declares any, each step's commit is checked against that scope plus the files the phase's copy steps wrote, and any other changed file is recorded on the step. The dev site lists those per plan as "unexpected files", so the review starts there. A file outside the scope isn't wrong, but it should be explained, and it often means scope creep or a plan that missed something.

```yaml
  - kind: prompt
    prompt: >
      Add a color property to the Widget schema, then regenerate dist.
    files:
      - product/service/spec/schemas/widget.yaml
      - product/service/spec/dist/**
```

Declare what the step should touch, not the whole package: `product/service/http/handlers/widgets/**` rather than `product/service/http/**`. Include the tests that go with the change, since the phase's test step may need to fix them.

## Workflows to call

Backend, in the usual order when all of them apply:

- `openapi/schema` — business object (`name`, `prompt`)
- `openapi/route` — one URL per action (`path`, `urlPath`, `method`, `prompt`). `urlPath` uses `{param}`. `method` is lowercase.
- `drizzle/update-schema` — one table (`path` under `./schemas/`, `prompt`). No FK cascades.
- `drizzle/add-query` — one query file (`path` under `./queries/`, `prompt`)
- `express/add-handler` — one handler under `handlers/`

Frontend:

- `sdk/add-query` and `sdk/add-mutation` — `path`, `urlPath`, `method`, `prompt`
- `vue/add-view` — `path`, `urlPath` (`:param` style), `prompt`

Use `prompt` steps for edits to files that already exist and were not created by a template (hand-written schemas, removing an old route). Do not point `drizzle/update-schema` at a file that has no workflow areas.

## Stopping points

Each phase file should end at a place you can typecheck and test (often a `command` step running `npm run typecheck` or tests in that package). A later phase assumes earlier phases have been run.

Only run a script the package actually has: check its `package.json` first. A `command` step running `npm run <script>` in a package without that script fails straight away instead of asking the agent to fix it, and `new-workflow validate` reports it. When a command fails, the agent is told to fix only what the phase broke, and to stop and report anything else rather than work around it.

**Do not** add a trailing “summarize this phase” `prompt` with `pauseAfter: true` by default. That was an older pattern for manual review between files; it adds an extra agent turn and stops unattended **play-plan** runs, since every dev-site mode (play-plan included) halts at `pauseAfter`. Prefer ending on mechanical work plus typecheck.

Use `pauseAfter: true` only when a step truly needs a human gate before anything else in the same file should run — for example a spec review inside `processes/spec-project`, or a one-off “run e2e on the host before merge” checkpoint. Every dev-site mode honors `pauseAfter`, including **play-plan**: it stops at the gate, and only cascades to the next `phase-*.workflow.yaml` once a phase finishes.

Smoke-check a phase with `new-workflow validate <path-to-phase.yaml>` from the plan folder (or anywhere in the repo). Validate previews mechanical steps against the monorepo root at `HEAD`, preferring the working tree when a target file exists on disk. For `integrations/init`, pass `path: <product>/service/integrations/<name>` from the repo root — do not `cd` into the product folder alone (it has no `package.json`).
