**@saflib/vendors-sentry-client**

---

# @saflib/vendors-sentry-client

## Interfaces

| Interface                                                    | Description                                                             |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| [SentryCallbackOptions](interfaces/SentryCallbackOptions.md) | `@saflib/vendors-sentry-client` — Sentry Vue/browser adapters for SPAs. |

## Variables

| Variable                                          | Description |
| ------------------------------------------------- | ----------- |
| [~~sentryCallback~~](variables/sentryCallback.md) | -           |

## Functions

| Function                                                  | Description                                                                                                                                                                                                          |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [createSentryCallback](functions/createSentryCallback.md) | `@saflib/vendors-sentry-client` — Sentry Vue/browser adapters for SPAs.                                                                                                                                              |
| [identifyToSentry](functions/identifyToSentry.md)         | Associate the current Kratos session with Sentry error reports. Call when the session becomes available (e.g. from the app shell on load), mirroring identifyToPostHog. Only the user id is sent — no email or name. |
| [resetSentryUser](functions/resetSentryUser.md)           | Clear Sentry user context when the session ends.                                                                                                                                                                     |
