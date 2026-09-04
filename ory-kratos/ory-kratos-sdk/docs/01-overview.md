# Overview

`@saflib/ory-kratos-sdk` wraps the [Ory Kratos Frontend API](https://www.ory.sh/docs/kratos/reference/api-frontend) with TanStack Query — session queries, self-service flow create/get/submit, typed 4xx results, and MSW fakes for tests.

Custom auth UI lives in [`@saflib/ory-kratos-spa`](../ory-kratos-spa/docs/01-overview.md). See the [suite overview](../docs/01-overview.md).

## What this package provides

- **Session** — `useKratosSession`, identity helpers (`identityNeedsEmailVerification`, MFA probes)
- **Flow queries** — `useCreateLoginFlowQuery`, `useGetSettingsFlowQuery`, … for each Kratos browser flow
- **Flow mutations** — `useUpdateLoginFlowMutation`, … with cache updates and typed outcomes (updated flow, session available, redirect required, CSRF, gone)
- **`@saflib/ory-kratos-sdk/links`** — typed route objects for the auth SPA
- **`@saflib/ory-kratos-sdk/fakes`** — MSW handlers and test doubles

Importing the package root registers Vue Query's default error type as `TanstackError`.

## Why Kratos needs special handling

Kratos uses **4xx for normal UX** — validation errors return an updated flow (400), expired flows return 410, CSRF mismatches 403, browser redirects 422. The SDK maps these to **result classes** instead of throwing; only unexpected failures become [`TanstackError`](../../../sdk/docs/ref/@saflib/sdk/classes/TanstackError.md).

## Integration

SPAs call session and flow APIs from loaders and composables; routing (`/new-login`, verify wall, return URLs) stays in each application. Auth link constants come from `./links`.

For query/mutation patterns, source layout, and testing guidance, see the [SDK guide](./02-sdk-guide.md).
