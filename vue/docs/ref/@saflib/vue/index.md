[**@saflib/vue**](../../index.md)

---

# @saflib/vue

Common utilities for Vue SPAs and pages.

## Interfaces

| Interface                                                | Description                                                                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [CreateVueAppOptions](interfaces/CreateVueAppOptions.md) | Options for createVueApp.                                                                                                                   |
| [I18nMessages](interfaces/I18nMessages.md)               | Generic interface for vue-i18n translation objects supported by SAF.                                                                        |
| [I18NObject](interfaces/I18NObject.md)                   | Interface for flat vue-i18n objects, where each key is a string. Used most commonly for strings which are shared for a single HTML element. |

## Type Aliases

| Type Alias                                                   | Description                                                                                                                                                      |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [LoaderQueries](type-aliases/LoaderQueries.md)               | A record of loader queries.                                                                                                                                      |
| [LoaderQuery](type-aliases/LoaderQuery.md)                   | A subset of what `useQuery` returns. This is so that loaders can create pseudo-queries by simply creating objects with isLoading, error, and isError properties. |
| [ProductEventCommon](type-aliases/ProductEventCommon.md)     | Common fields for all product events.                                                                                                                            |
| [ProductEventListener](type-aliases/ProductEventListener.md) | A function that receives product events as they're emitted.                                                                                                      |

## Functions

| Function                                                      | Description                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [createVueApp](functions/createVueApp.md)                     | Wrapper around vue's `createApp` function. Handles SAF-required plugins.                                                                                                                                                                                                                                                                          |
| [getClientName](functions/getClientName.md)                   | Getter for the client name.                                                                                                                                                                                                                                                                                                                       |
| [getHost](functions/getHost.md)                               | Utility to get the current host, including the port, e.g. "localhost:3000".                                                                                                                                                                                                                                                                       |
| [getProtocol](functions/getProtocol.md)                       | Utility to get the current protocol the same way document.location.protocol does, e.g. "http:" or "https:".                                                                                                                                                                                                                                       |
| [linkToHrefWithHost](functions/linkToHrefWithHost.md)         | -                                                                                                                                                                                                                                                                                                                                                 |
| [linkToProps](functions/linkToProps.md)                       | Given a Link object, return props which will work with vuetify components such as v-list-item and b-btn. What is returned is based on the current domain; if the link is to the same subdomain, this returns a "to" prop, otherwise it returns an "href" prop. That way a link will use vue-router wherever possible, to avoid full page reloads. |
| [makeProductEventLogger](functions/makeProductEventLogger.md) | Create centralized object to emit and listen to product events. Provide a product event type to ensure type safety, produced as part of the API spec.                                                                                                                                                                                             |
| [makeReverseTComposable](functions/makeReverseTComposable.md) | Creates an alternative to Vue I18n's $t function, which takes the English text instead of a key. This is mainly so TypeScript enforces that keys are translated to strings.                                                                                                                                                                       |
| [navigateToLink](functions/navigateToLink.md)                 | Simple utility to do a full page redirect to a link.                                                                                                                                                                                                                                                                                              |
| [setClientName](functions/setClientName.md)                   | Call when the SPA starts, providing the name of the client. It should be the same as the subdomain, or "root" if it's the root domain.                                                                                                                                                                                                            |
| [useClientCommon](functions/useClientCommon.md)               | Get the common context for a product event.                                                                                                                                                                                                                                                                                                       |
