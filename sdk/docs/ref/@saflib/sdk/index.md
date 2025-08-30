[**@saflib/sdk**](../../index.md)

---

# @saflib/sdk

Tanstack Query utilities for Vue.

## Classes

| Class                                     | Description                                                                                        |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [TanstackError](classes/TanstackError.md) | Error returned by `handleClientMethod` so that Tanstack errors are always instances of this class. |

## Interfaces

| Interface                                                | Description                                                                            |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [ClientResponse](interfaces/ClientResponse.md)           | Interface for the successful response from the client that handleClientMethod expects. |
| [ClientResponseError](interfaces/ClientResponseError.md) | Interface for the error from the client that handleClientMethod expects.               |
| [ClientResult](interfaces/ClientResult.md)               | Interface for the result from the client that handleClientMethod expects.              |

## Functions

| Function                                                            | Description                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [createSafClient](functions/createSafClient.md)                     | Given a "paths" openapi generated type and a subdomain, creates a typed `openapi-fetch` client which queries the given subdomain. Uses the current domain and protocol. Handles CSRF token injection, and works in tests.                                                                                                                               |
| [createTanstackQueryClient](functions/createTanstackQueryClient.md) | Creates a Tanstack Query client with default timeout and retry settings. It has a staleTime of 10 seconds, so that requests made from different parts of the page during a page load don't trigger multiple requests. It also doesn't retry for status codes that are unlikely to be fixed by retrying, such as 401, 403, 404, 500, and network errors. |
| [handleClientMethod](functions/handleClientMethod.md)               | Wrapper around an openapi-fetch client fetch method to handle errors and return the data in a way that is compatible with Tanstack Query.                                                                                                                                                                                                               |
