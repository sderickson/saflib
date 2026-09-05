# Overview

Workflows and conventions for wrapping third-party APIs into integration packages. Each package exposes a scoped, mockable client and product-facing **calls** that HTTP handlers and other service code import. By structuring integrations this way, you make testing and local development much easier, and you have a source of truth for how exactly the service is used in the product.

Use [integrations/init](./workflows/init.md) to create a new service integration and [integrations/add-call](./workflows/add-call.md) to add a new way of using that service.

## Package structure and integration

See [base](https://github.com/sderickson/saflib/tree/main/base/service/integrations/__integration-name__).

Integration packages live under `{product}/service/integrations/{name}/` alongside other service packages. They are **libraries** — they do not listen on a port or run as workers. Name packages after the vendor (`stripe`, `sendgrid`) to make clear what services your product integrates with.

| Concern          | Pattern                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------- |
| Package path     | `{product}/service/integrations/{name}/`                                                    |
| Package name     | `@{org}/{product}-{name}`                                                                   |
| Boot wiring      | `integrations/init` weaves `configure{Name}()` into `{product}/service/common` dependencies |
| What apps import | **Calls** from the integration package — not the vendor SDK                                 |
| Tests            | `vitest run` sets `NODE_ENV=test` → mocks automatically; no `vi.mock` on integrations       |

## Runtime: Credentials, Mocks, and CLI Testing

Store credentials in [a secret store](../../secret-store/docs/01-overview.md), and declare any secrets the integration needs in the integration package. By default when the secret store is mocked, any missing secrets will be "mock" and so when this happens, the integration package should return a mock client. This way tests and local development can run without breaking or needing real credentials, which is important for both security and ease of development.

Workflows will automatically create these mock behaviors for you.

Sometimes as part of integration development, it's helpful to test a new call you're working on in isolation, or even to make calls in order to set up a new integration. When an integration call is added, a bin command to that call is also added. If you add real credentials to the integration package's `.env` file, you can test real calls in this way.

Every integration includes `calls/ping.ts` from init — a minimal read-only call (list, get, search; never create/update/delete) to verify connectivity. Run `npm run ping` after adding your API key to `.env` to check that it works.

## Mock implementation

Mock data and mock client construction live in `mocks/client.ts`, exported at `@…-integration/mocks`. Keep this file **SDK-free** — `import type` from the vendor at most. Production SDK wiring belongs in `client.real.ts`.

`client.ts` branches on `isMocked()` and returns the mock from `get{Name}Client()` when appropriate.

Mocks are used in unit tests (`NODE_ENV=test`) and when the secret is `"mock"`. Keep responses minimal but structurally correct.
