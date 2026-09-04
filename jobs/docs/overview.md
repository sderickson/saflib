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

The trigger map is the security and product contract for chaining work. It makes sure only handlers intended for background work may be run in the background, and enforces who may enqueue that work. This also provides a useful graph for understanding and reasoning about how background work is structured in an application.

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

## Authority

Background work still runs through the product's normal HTTP auth model. A job is not anonymous system work — it always has an **acting user** (`user_id`) and an **authority grant** that records _why_ that user is allowed to run the target operation when delivery happens (seconds or hours later, without the original browser request).

### What gets stored

At enqueue time the jobs service persists:

- **`user_id`** — the user the background handler should run as.
- **`authority`** — a typed grant (`request`, `resource`, or `cron`) plus the enqueue-hop identity assertion token.
- **`original_request_id`** — chains spawned jobs back to the root HTTP request (or cron tick) for spawn-cap and cancellation.

List/admin wire responses expose the grant **without** the embedded assertion (to keep payloads small). `getJob` returns the raw token separately as `authority_assertion` for debugging in the admin UI.

### Grant kinds

| Kind       | Typical source                                                                | What it means                                                                                                                                                                       |
| ---------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `request`  | `enqueue()` from a foreground or background handler                           | Work continues under the same user and request chain that enqueued it.                                                                                                              |
| `resource` | `enqueueOnBehalfOf()` after attributing an inbound event to a stored resource | Work runs as the resource owner. `resource_kind` + `resource_id` name the persisted row (e.g. `channel_subscription` + id) — not the webhook or other event that triggered enqueue. |
| `cron`     | `makeCronEnqueuer()` on a cron tick                                           | Work runs as the admin who **enabled** the cron job (`job_settings.enabled_by`).                                                                                                    |

### At enqueue

- **`enqueue()`** — uses the current request's authenticated user and builds a `request` grant from `getSafContextWithAuth()`. The internal enqueue call carries a signed identity assertion (`x-saf-identity-assertion`) with `callingOperationId` and `originalRequestId` claims; those claims are checked against the trigger map.
- **`enqueueOnBehalfOf()`** — same path, but you supply an explicit `user_id` and `authority` evidence when the acting user is not the caller. Typical for inbound events (webhooks, etc.) after you attribute the payload to a stored resource that represents the setting which substantiates user intent.
- **Cron** — `makeCronEnqueuer` signs with `callingOperationId = cron:{jobName}` and enqueues with `on_behalf_of` cron authority for `enabledBy`. See [cron authority](../../cron/docs/overview.md#authority).

### At delivery

When the runtime delivers a job, it invokes the target background handler over the internal caller **as `job.user_id`**, with MFA taken from the stored enqueue assertion. The handler's scoped middleware still runs — delivery does not bypass auth tags or site-admin checks. The `background` tag only marks an operation as enqueueable; authority decides who the attempt runs as.

Chained jobs inherit lineage via assertion claims (`jobId`, `originalRequestId`) so spawn caps and cancel-by-chain can reason about the tree.

## Relationship with cron

Cron schedules recurring **enqueue** only — it does not run background handlers itself. Each cron job name must have a matching `cron:{jobName}` entry in the product trigger map (validated at startup against the registered cron jobs map).

See the [cron suite](../../cron/docs/overview.md#relationship-with-jobs).

## Packages

| Package                                                      | Role                                                                   | Docs                                                                                                 |
| ------------------------------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [@saflib/jobs-spec](../jobs-spec/docs/ref/index.md)          | OpenAPI contract (`Job` wire schema, enqueue + admin surfaces)         | [Overview](../jobs-spec/docs/overview.md) · [Code reference](../jobs-spec/docs/ref/index.md)         |
| [@saflib/jobs-db](../jobs-db/docs/ref/index.md)              | SQLite schema and queue queries                                        | [Code reference](../jobs-db/docs/ref/index.md)                                                       |
| [@saflib/jobs-http](../jobs-http/docs/ref/index.md)          | Runtime, internal enqueue app, admin router, enqueue client, workflows | [Code reference](../jobs-http/docs/ref/index.md) · [Workflows](../jobs-http/docs/workflows/index.md) |
| [@saflib/jobs-vue](../jobs-vue/docs/ref/components/index.md) | Admin SPA page (list, cancel, retry)                                   | [Components](../jobs-vue/docs/ref/components/index.md)                                               |
