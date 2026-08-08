# Overview

`@saflib/jobs-spec` is the OpenAPI contract for the jobs queue service:
the `Job` wire schema and the internal + admin HTTP surfaces.

## Surfaces

| Surface | Operations | Auth |
| --- | --- | --- |
| Internal (jobs app socket) | `enqueueJob` | M1 signed assertion (not `site-admin-only`) |
| Admin (mounted into the product public app) | `listJobs`, `getJob`, `retryJob`, `cancelJob`, `cancelJobsByOriginalRequest` | `site-admin-only` |

## `background` tag

Work endpoints that the queue may deliver to must carry the OpenAPI tag
`background` on their route YAML in the **product** spec (e.g. the main API service spec), not
on jobs-spec control-plane routes.

- Marks the operation as invocable by the job queue.
- Carries **no auth semantics** of its own — delivery still uses a per-attempt
  assertion and the target endpoint's normal middleware.
- Foreground-only (omit the tag) is the default; untagged operations cannot be
  enqueue targets (422 at enqueue; startup validation rejects bad trigger-map
  entries).

See [@saflib/openapi operation tags](../../../openapi/docs/03-tags.md) for the
full tag list.

## Related packages

- `@saflib/jobs-db` — SQLite schema and queries
- `@saflib/jobs` — runtime, internal app, admin router, client
- `@saflib/jobs-vue` — admin UI
- `@saflib/openapi` — OpenAPI tooling and [tag conventions](../../../openapi/docs/03-tags.md)
