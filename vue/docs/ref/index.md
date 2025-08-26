**@saflib/vue**

***

# @saflib/vue

## Classes

| Class | Description |
| ------ | ------ |
| [TanstackError](classes/TanstackError.md) | Error returned by `handleClientMethod` so that Tanstack errors are always instances of this class. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [ClientResponse](interfaces/ClientResponse.md) | Interface for the successful response from the client that handleClientMethod expects. |
| [ClientResponseError](interfaces/ClientResponseError.md) | Interface for the error from the client that handleClientMethod expects. |
| [ClientResult](interfaces/ClientResult.md) | Interface for the result from the client that handleClientMethod expects. |
| [CreateVueAppOptions](interfaces/CreateVueAppOptions.md) | Options for createVueApp. |
| [I18nMessages](interfaces/I18nMessages.md) | Generic interface for vue-i18n translation objects supported by SAF. |
| [I18NObject](interfaces/I18NObject.md) | Interface for flat vue-i18n objects, where each key is a string. Used most commonly for strings which are shared for a single HTML element. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [LoaderQueries](type-aliases/LoaderQueries.md) | A record of loader queries. |
| [LoaderQuery](type-aliases/LoaderQuery.md) | A subset of what `useQuery` returns. This is so that loaders can create pseudo-queries by simply creating objects with isLoading, error, and isError properties. |
| [ProductEventCommon](type-aliases/ProductEventCommon.md) | Common fields for all product events. |
| [ProductEventListener](type-aliases/ProductEventListener.md) | A function that receives product events as they're emitted. |

## Functions

| Function | Description |
| ------ | ------ |
| [createSafClient](functions/createSafClient.md) | Given a "paths" openapi generated type and a subdomain, creates a typed `openapi-fetch` client which queries the given subdomain. Uses the current domain and protocol. Handles CSRF token injection, and works in tests. |
| [createTanstackQueryClient](functions/createTanstackQueryClient.md) | Creates a Tanstack Query client with default timeout and retry settings. It has a staleTime of 10 seconds, so that requests made from different parts of the page during a page load don't trigger multiple requests. It also doesn't retry for status codes that are unlikely to be fixed by retrying, such as 401, 403, 404, 500, and network errors. |
| [createVueApp](functions/createVueApp.md) | Wrapper around vue's `createApp` function. Handles SAF-required plugins. |
| [getClientName](functions/getClientName.md) | Getter for the client name. |
| [getHost](functions/getHost.md) | Utility to get the current host, including the port, e.g. "localhost:3000". |
| [getProtocol](functions/getProtocol.md) | Utility to get the current protocol the same way document.location.protocol does, e.g. "http:" or "https:". |
| [getViteEnv](functions/getViteEnv.md) | Get the vite environment variables. |
| [handleClientMethod](functions/handleClientMethod.md) | Wrapper around an openapi-fetch client fetch method to handle errors and return the data in a way that is compatible with Tanstack Query. |
| [makeProductEventLogger](functions/makeProductEventLogger.md) | Create centralized object to emit and listen to product events. Provide a product event type to ensure type safety, produced as part of the API spec. |
| [makeReverseTComposable](functions/makeReverseTComposable.md) | Creates an alternative to Vue I18n's $t function, which takes the English text instead of a key. This is mainly so TypeScript enforces that keys are translated to strings. |
| [setClientName](functions/setClientName.md) | Call when the SPA starts, providing the name of the client. It should be the same as the package name, without the org prefix, so "web-auth" or "web-landing". |
| [useClientCommon](functions/useClientCommon.md) | Get the common context for a product event. |
