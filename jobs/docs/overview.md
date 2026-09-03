# Overview

The jobs suite runs a durable async queue inside the monolith. Work is modeled as OpenAPI **background** operations on the product API: handlers enqueue jobs, the runtime claims them from SQLite, and delivers each attempt as an internal HTTP call to the target handler.

Typical integration:

- A `jobs/` package as part of a service or offshoot (trigger map, per-operation config, `run…Jobs`).
- The monolith starts the jobs runtime and internal enqueue socket during boot.
- The adjacent `http` package mounts `createJobsRouter` on the public HTTP app for admin list/get/cancel/retry.
- The admin SPA includes `@saflib/jobs-vue` pages.
- Background work is implemented with `express/add-handler` and invoked from foreground, background, or cron.

Use [jobs/init](../jobs-http/docs/workflows/init.md) to scaffold the product jobs package and [jobs/add-job](../jobs-http/docs/workflows/add-job.md) to add trigger-map edges.

## Package structure and integration

See [base](https://github.com/sderickson/saflib/tree/main/base/service/jobs).

| Concern            | Pattern                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Product package    | `{product}/service/jobs/` → `@{org}/{product}-jobs`                                          |
| Trigger map        | Reviewed `callerOperationId → targetOperationId[]` contract; enforced at enqueue and startup |
| Background targets | OpenAPI operations on the **product** spec with the `background` tag                         |
| Cron sources       | `cron:{jobName}` keys in the trigger map (paired with `@saflib/cron-http` jobs)              |
| Queue DB           | Separate SQLite file via `@saflib/jobs-db` (`get…JobsDbKey`)                                 |
| Enqueue            | `enqueue()` / `enqueueOnBehalfOf()` over the jobs internal unix socket                       |
| Admin API          | `createJobsRouter` mounted on the public HTTP app (`site-admin-only`)                        |

## Trigger map and background handlers

The trigger map is the security and product contract for chaining work:

```ts
export const acmeTriggerMap: TriggerMap = {
  startExport: ["processExportChunk"],
  processExportChunk: ["finalizeExport"],
  "cron:nightlyCleanup": ["purgeStaleRows"],
};
```

- Keys are calling `operation_id`s (HTTP handlers, prior job steps, or `cron:…`).
- Values are target `operation_id`s that caller may enqueue.
- Every target must exist in the bundled product OpenAPI spec and carry the `background` tag.
- Optional `operationConfig` overrides per target (`timeoutMs`, `maxAttempts`; ≤ 120s ceiling).

HTTP handlers enqueue with `enqueue({ operation_id: "processExportChunk", … })`. The runtime delivers by invoking the background handler over the internal caller, with per-attempt assertions and the handler's normal middleware.

See [@saflib/jobs-spec `background` tag](../jobs-spec/docs/overview.md#background-tag) and [@saflib/openapi operation tags](../../openapi/docs/03-tags.md).

## Relationship with cron

Cron schedules recurring **enqueue** only — it does not run background handlers itself. Each cron job name must have a matching `cron:{jobName}` entry in the product trigger map (validated at startup against the registered cron jobs map).

See the [cron suite](../../cron/docs/overview.md#relationship-with-jobs).

## Packages

| Package | Role | Docs |
| --- | --- | --- |
| [@saflib/jobs-spec](../jobs-spec/docs/ref/index.md) | OpenAPI contract (`Job` wire schema, enqueue + admin surfaces) | [Overview](../jobs-spec/docs/overview.md) · [Code reference](../jobs-spec/docs/ref/index.md) |
| [@saflib/jobs-db](../jobs-db/docs/ref/index.md) | SQLite schema and queue queries | [Code reference](../jobs-db/docs/ref/index.md) |
| [@saflib/jobs-http](../jobs-http/docs/ref/index.md) | Runtime, internal enqueue app, admin router, enqueue client, workflows | [Code reference](../jobs-http/docs/ref/index.md) · [Workflows](../jobs-http/docs/workflows/index.md) |
| [@saflib/jobs-vue](../jobs-vue/docs/ref/components/index.md) | Admin SPA page (list, cancel, retry) | [Components](../jobs-vue/docs/ref/components/index.md) |
