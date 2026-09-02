[**@saflib/sdk**](../../index.md)

---

# @saflib/sdk

Tanstack Query utilities for Vue.

## Classes

| Class                                     | Description                                                                                        |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [TanstackError](classes/TanstackError.md) | Error returned by `handleClientMethod` so that Tanstack errors are always instances of this class. |

## Interfaces

| Interface                                        | Description                         |
| ------------------------------------------------ | ----------------------------------- |
| [DownloadOptions](interfaces/DownloadOptions.md) | Options for the download composable |

## Type Aliases

| Type Alias                                                                       | Description                                                       |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [AuthGateErrorCode](type-aliases/AuthGateErrorCode.md)                           | -                                                                 |
| [CredentialsEventSource](type-aliases/CredentialsEventSource.md)                 | -                                                                 |
| [CredentialsEventSourceHandlers](type-aliases/CredentialsEventSourceHandlers.md) | Cookie-authenticated SSE over `fetch` (`credentials: "include"`). |

## Variables

| Variable                                                                                      | Description                                                                                  |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED](variables/AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED.md) | Returned as JSON `code` on 403 from auth middleware when email is not verified.              |
| [AUTH_ERROR_MFA_REQUIRED](variables/AUTH_ERROR_MFA_REQUIRED.md)                               | Returned as JSON `code` on 403 when the route requires MFA (AAL2+) and the session does not. |

## Functions

| Function                                                                  | Description                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [createCredentialsEventSource](functions/createCredentialsEventSource.md) | Long-lived SSE subscription with session cookies. Reconnects on drop/errors until [CredentialsEventSource.close](type-aliases/CredentialsEventSource.md#close).                                                                                                                                                                                              |
| [createSafClient](functions/createSafClient.md)                           | -                                                                                                                                                                                                                                                                                                                                                            |
| [createTanstackQueryClient](functions/createTanstackQueryClient.md)       | Creates a Tanstack Query client with default timeout and retry settings. It has a staleTime of 10 seconds, so that requests made from different parts of the page during a page load don't trigger multiple requests. It also doesn't retry for status codes that are unlikely to be fixed by retrying, such as 401, 402, 403, 404, 500, and network errors. |
| [getBaseUrl](functions/getBaseUrl.md)                                     | -                                                                                                                                                                                                                                                                                                                                                            |
| [getTanstackErrorMessage](functions/getTanstackErrorMessage.md)           | Returns a human-readable error message based on the TanstackError status code.                                                                                                                                                                                                                                                                               |
| [handleClientMethod](functions/handleClientMethod.md)                     | Wrapper around an openapi-fetch client fetch method to handle errors and return the data in a way that is compatible with Tanstack Query.                                                                                                                                                                                                                    |
| [useDownload](functions/useDownload.md)                                   | Composable for downloading files with CSRF protection                                                                                                                                                                                                                                                                                                        |
