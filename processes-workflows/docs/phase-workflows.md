# Phase workflow YAML

A project folder under `<product>/plans/notes/<date>-<name>/` is a sequence of workflow files. **Play current plan** runs the next `.yaml` in alphabetical order when the current file finishes. `phase-0-plan.workflow.yaml` is already there (it calls `processes/spec-project`). Later files should be `phase-1-<slug>.workflow.yaml`, `phase-2-<slug>.workflow.yaml`, and so on.

Do **not** add a file named after the project (`<name>.workflow.yaml`). That name sorts after `phase-6` and Play current plan will start it after the last phase, which re-runs the whole project.

There is no separate plan markdown and no generated orchestrator. The phase files are the plan. Review them in the dev site (open a phase, preview, then run one phase at a time).

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

**Do not** add a trailing “summarize this phase” `prompt` with `pauseAfter: true` by default. That was an older pattern for manual review between files; it adds an extra agent turn and blocks unattended **play-plan** unless the dev site is in plan mode (which auto-continues past `pauseAfter`). Prefer ending on mechanical work plus typecheck.

Use `pauseAfter: true` only when a step truly needs a human gate before anything else in the same file should run — for example a spec review inside `processes/spec-project`, or a one-off “run e2e on the host before merge” checkpoint. **Play-workflow** and **play-step** honor `pauseAfter`; **play-plan** ignores it and keeps cascading to the next `phase-*.workflow.yaml` when a phase finishes.

Smoke-check a phase with `new-workflow validate <path-to-phase.yaml>` from the plan folder (or anywhere in the repo). Validate previews mechanical steps against the monorepo root at `HEAD`, preferring the working tree when a target file exists on disk. For `integrations/init`, pass `path: <product>/service/integrations/<name>` from the repo root — do not `cd` into the product folder alone (it has no `package.json`).
