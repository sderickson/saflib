# Environment Variables

This package uses environment variables. The schema for these variables is as follows:

| Variable                | Description                                                                                                                                      | Type   | Required |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | -------- |
| POSTHOG_PROJECT_API_KEY | PostHog project API key for server-side capture. Omit, leave empty, or set to "mock" to use the in-memory analytics implementation (no network). | string |          |
| POSTHOG_PROJECT_HOST    | PostHog ingest host for server-side capture. Defaults to https://us.i.posthog.com when unset.                                                    | string |          |
