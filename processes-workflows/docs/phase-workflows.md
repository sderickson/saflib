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

Each phase file should end at a place you can typecheck and test. A later phase assumes earlier phases have been run. Put a short `prompt` at the end of a phase only when a person must look at the result before the next file; set `pauseAfter: true` on that step so play-workflow and play-plan stop even if they are set to continue.

```yaml
  - kind: prompt
    pauseAfter: true
    pauseMessage: Review the schema diff, then continue.
    prompt: Summarize what changed in the widget table. Do not start the next phase.
```

Smoke-check a phase with `new-workflow validate` on the file path before treating it as ready to run.
