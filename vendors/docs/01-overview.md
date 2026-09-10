# Overview

`vendors` holds **optional production backends** for SAF abstract packages — thin adapters around third-party SDKs. Products opt in at bootstrap (`configure*` helpers); local dev and tests use in-memory or env-backed implementations from the abstract layer.

Each vendor package is a direct npm workspace under `saflib/vendors/{name}/` and imports as `@saflib/vendors-{name}`.

## By abstract package

| Abstract package | Vendor packages |
| ---------------- | --------------- |
| [`@saflib/secret-store`](../../secret-store/docs/01-overview.md) | [Infisical](../infisical/docs/01-overview.md) |
| [`@saflib/object-store`](../../object-store/docs/01-overview.md) | [GCS](../gcs/docs/01-overview.md), [Azure](../azure/docs/01-overview.md) |
| [`@saflib/email`](../../email/docs/01-overview.md) | [Brevo](../brevo/docs/01-overview.md) |
| [`@saflib/analytics`](../../analytics/docs/01-overview.md) | [PostHog (server)](../posthog/docs/01-overview.md), [PostHog (client)](../posthog-client/docs/01-overview.md) |
| [`@saflib/errors`](../../errors/docs/01-overview.md) | [Sentry (Node)](../sentry-node/docs/01-overview.md), [Sentry (client)](../sentry-client/docs/01-overview.md) |
| [`@saflib/node`](../../node/docs/01-overview.md) (logging) | [Loki](../loki/docs/01-overview.md) |

## Integration pattern

If you'd like to make your own, use [integrations/init](../../integrations/docs/workflows/init.md) and use an instance of the abstract class as the client. Declare any required secrets (see [secret store](../../secret-store/docs/01-overview.md)). Then instantiate and use the class; by using SAF abstract interfaces, it becomes trivial to duplicate or swap conventional services, and mocks and debugging tools work for free.