[**@saflib/vendors-posthog**](../index.md)

---

# index

## Classes

| Class                                                         | Description |
| ------------------------------------------------------------- | ----------- |
| [PosthogAnalyticsService](classes/PosthogAnalyticsService.md) | -           |

## Type Aliases

| Type Alias                                                                       | Description |
| -------------------------------------------------------------------------------- | ----------- |
| [PosthogAnalyticsServiceOptions](type-aliases/PosthogAnalyticsServiceOptions.md) | -           |

## Functions

| Function                                                                    | Description                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [configureAnalytics](functions/configureAnalytics.md)                       | Initializes the process-level analytics client from PostHog env (`POSTHOG_PROJECT_API_KEY`, `POSTHOG_PROJECT_HOST`). Uses in-memory when the key is missing/`mock`, or when `NODE_ENV` is `test`. Idempotent — subsequent calls are no-ops. |
| [createPosthogAnalyticsService](functions/createPosthogAnalyticsService.md) | Convenience factory for PostHog-backed analytics.                                                                                                                                                                                           |
| [getAnalyticsClient](functions/getAnalyticsClient.md)                       | Returns the process-level analytics client, configuring from env on first use.                                                                                                                                                              |
| [resetAnalyticsForTests](functions/resetAnalyticsForTests.md)               | Test-only: clear the process-level client so configure / set can run again.                                                                                                                                                                 |
