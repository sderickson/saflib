# Overview

Thin helpers around [XState](https://stately.ai/docs). The library is a **dependency of [`@saflib/workflows`](../workflows/docs/01-overview.md)** today — step machines compile to XState actors internally. Workflow authors use `defineWorkflow` / step machines, not XState APIs directly.

Code reference: [`docs/ref/`](./ref/index.md) (`allChildrenSettled` only, for now).

## Current use

| Area | Status |
| ---- | ------ |
| Developer workflows | XState runs under the hood in `@saflib/workflows`; likely to be **replaced or hidden** in a future workflow-tool iteration |
| Backend product processes | Intended pattern (persisted snapshots, resumed by http/grpc/cron) — **no saflib example yet** |

This package may shrink or go away if workflows drop XState. Do not build new features on it unless you are experimenting with raw XState machines.

## `allChildrenSettled`

[`allChildrenSettled`](./ref/functions/allChildrenSettled.md) — use with `waitFor(actor, allChildrenSettled)` when a parent machine should keep running until spawned children finish, even if the parent never reaches a terminal state.

```typescript
import { createActor, waitFor } from "xstate";
import { allChildrenSettled } from "@saflib/xstate";

const actor = createActor(machine);
actor.start();
await waitFor(actor, allChildrenSettled);
```
