**@saflib/analytics-service**

---

# @saflib/analytics-service

## Classes

| Class                                                           | Description                                                                                                                                                                 |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [AnalyticsServiceBase](classes/AnalyticsServiceBase.md)         | Shared server-side analytics behavior: merges `getSafContext()`-derived fields into every `capture` payload so all integrations (PostHog, in-memory, etc.) stay consistent. |
| [InMemoryAnalyticsService](classes/InMemoryAnalyticsService.md) | Shared server-side analytics behavior: merges `getSafContext()`-derived fields into every `capture` payload so all integrations (PostHog, in-memory, etc.) stay consistent. |

## Interfaces

| Interface                                          | Description                                                                                                                                                                                                                       |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [AnalyticsService](interfaces/AnalyticsService.md) | Server-side analytics client. Concrete implementations should extend `AnalyticsServiceBase` so each `capture` uses `getSafContext().auth.userId` as PostHog distinct id and enriches payloads from SafContext (e.g. HTTP `host`). |
| [CommonEvent](interfaces/CommonEvent.md)           | -                                                                                                                                                                                                                                 |
| [IdentifyProps](interfaces/IdentifyProps.md)       | Matches PostHog `identify` input closely enough for both integrations.                                                                                                                                                            |

## Type Aliases

| Type Alias                                                                     | Description |
| ------------------------------------------------------------------------------ | ----------- |
| [CapturedAnalyticsCall](type-aliases/CapturedAnalyticsCall.md)                 | -           |
| [CreateAnalyticsServiceOptions](type-aliases/CreateAnalyticsServiceOptions.md) | -           |
| [TypedAnalytics](type-aliases/TypedAnalytics.md)                               | -           |

## Variables

| Variable                                                      | Description                                                                              |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [capturedAnalyticsCalls](variables/capturedAnalyticsCalls.md) | Shared log for all in-memory analytics instances (mirrors the email mock store pattern). |

## Functions

| Function                                                                | Description                                                                                                                                                                 |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [clearCapturedAnalyticsCalls](functions/clearCapturedAnalyticsCalls.md) | -                                                                                                                                                                           |
| [createAnalyticsService](functions/createAnalyticsService.md)           | Creates an in-memory analytics service. For PostHog, use `@saflib/vendors-posthog`.                                                                                         |
| [getAnalyticsClient](functions/getAnalyticsClient.md)                   | Returns the client set by [setAnalyticsClient](functions/setAnalyticsClient.md).                                                                                            |
| [hasAnalyticsClient](functions/hasAnalyticsClient.md)                   | Whether a process-level analytics client has been set.                                                                                                                      |
| [makeTypedAnalytics](functions/makeTypedAnalytics.md)                   | -                                                                                                                                                                           |
| [resetAnalyticsForTests](functions/resetAnalyticsForTests.md)           | Test-only: clear the process-level client so configure / set can run again.                                                                                                 |
| [setAnalyticsClient](functions/setAnalyticsClient.md)                   | Sets the process-level analytics client. Idempotent — subsequent calls are no-ops. Vendor packages (e.g. `@saflib/vendors-posthog`) call this from their configure helpers. |
