# Overview

`@saflib/ory-kratos-http` is the **server-side** Kratos integration: a small internal Express app for courier webhooks and optional identity-action callbacks, plus helpers to resolve auth context from Kratos identity IDs.

Browser flows and session state live in [`@saflib/ory-kratos-sdk`](../ory-kratos-sdk/docs/01-overview.md). See the [suite overview](../docs/01-overview.md) for how products wire this package.

## What this package provides

- **`startOryKratosService()` / `createOryKratosApp()`** — boots the internal courier/action HTTP server
- **`createPostKratosCourierHandler()`** — handles Kratos courier template callbacks (verification, recovery, login codes, …)
- **`makePostKratosActionHandler()`** — optional webhook for Kratos identity lifecycle actions
- **`resolveAuthFromIdentityId()`** — map a Kratos identity to product auth context
- **Re-exports** from `@saflib/express/kratos-admin` — admin API helpers (`fetchKratosIdentityById`, `resolveUserIdByEmail`, …)

## Integration

Product code supplies `KratosCourierCallbacks` and `KratosActionHandler` implementations — see [`base/service/kratos-handlers`](../../../base/service/kratos-handlers/) for the reference wiring with `@saflib/base-email`.

```ts
import { startOryKratosService } from "@saflib/ory-kratos-http";
import { callbacks, makeKratosActionHandler } from "@your-product/kratos-handlers";

startOryKratosService({
  courierCallbacks: callbacks,
  actionHandler: makeKratosActionHandler(),
});
```

Environment (see `env.schema.json`):

- **`KRATOS_HANDLER_HTTP_HOST`** — host:port for this internal server (e.g. `recipes-monolith:3000`)

Kratos itself is configured in product `dev/kratos/` and points courier delivery at this service.

## Code reference

Generated API docs: [ref/index.md](./ref/index.md)
