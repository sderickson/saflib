# Overview

This library schedules **enqueue-only** cron ticks using a cron-like interface
([the cron NPM package](https://www.npmjs.com/package/cron)). Each tick reads
`job_settings`, and if the job is enabled with a recorded `enabled_by` admin,
calls an injected `enqueueJob` to enqueue a background API operation. Actual
work runs through the job queue — not inline in the cron process.

Related packages provide:

- Logging and metrics
- Admin page to enable/disable cron jobs and see who holds authority (`enabledBy`)

## Package Structure

Each package which depends on `@saflib/cron` should have the following structure:

```
{service-name}-cron/
├── cron.ts          # JobsMap + run*Cron (wires enqueueJob)
├── jobs/            # optional: group JobsMap fragments
│   └── {group-1}/
│       ├── index.ts
│       └── ...
├── package.json
```

## Files and Directories Explained

### `cron.ts`

Exports a declarative `JobsMap` and a runner that calls `runCron` with that map
plus a required `enqueueJob` (typically `makeCronEnqueuer` from `@saflib/jobs`,
wired by the monolith). Example entry:

```typescript
export const serviceJobs: JobsMap = {
  purgeClaudeFiles: {
    schedule: "*/15 * * * *",
    enqueue: { operationId: "purgeClaudeFilesMaintenance" },
  },
};
```

There is no `handler` — work lives in background HTTP operations on the product
API. Optional `enqueue.request`, `enqueue.dedupeKey` (default `cron:{jobName}`),
and `enqueue.priority` are supported.

### `jobs/`

Optional grouping: each group exports a `JobsMap` fragment that `cron.ts`
merges. Prefer naming entries after the schedule identity; the `operationId`
must exist on the product OpenAPI spec and be wired in the jobs trigger map.

## Authority

Enabling a cron job via the admin API records the calling admin's Kratos id in
`job_settings.enabled_by`. Ticks skip (with a warning) when a job is enabled but
`enabled_by` is null — re-enable once post-deploy to record authority. Disabling
retains the last `enabled_by` for audit.

## Related Packages

### Public

To manage cron jobs, render the page provided by [`@saflib/cron-vue`](../../cron-vue/docs/overview.md)

### Private

For development of the cron packages.

- [@saflib/cron-db](../../cron-db/docs/ref/index.md)
- [@saflib/cron-spec](../../cron-spec/docs/ref/index.md)
