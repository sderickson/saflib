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
| [TestMode](type-aliases/TestMode.md)                         | -                                                                                                                                                                |

## Variables

| Variable                          | Description |
| --------------------------------- | ----------- |
| [errors](variables/errors.md)     | -           |
| [events](variables/events.md)     | -           |
| [info](variables/info.md)         | -           |
| [testMode](variables/testMode.md) | -           |

## Functions

| Function                                                                | Description                                                                                                                                                                 |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [commonEventLogger](functions/commonEventLogger.md)                     | -                                                                                                                                                                           |
| [createVueApp](functions/createVueApp.md)                               | Wrapper around vue's `createApp` function. Handles SAF-required plugins.                                                                                                    |
| [getEvents](functions/getEvents.md)                                     | -                                                                                                                                                                           |
| [hideVueDevToolsIfInTestMode](functions/hideVueDevToolsIfInTestMode.md) | -                                                                                                                                                                           |
| [isTestEnv](functions/isTestEnv.md)                                     | -                                                                                                                                                                           |
| [isTestMode](functions/isTestMode.md)                                   | -                                                                                                                                                                           |
| [makeProductEventLogger](functions/makeProductEventLogger.md)           | Create centralized object to emit and listen to product events. Provide a product event type to ensure type safety, produced as part of the API spec.                       |
| [makeReverseTComposable](functions/makeReverseTComposable.md)           | Creates an alternative to Vue I18n's $t function, which takes the English text instead of a key. This is mainly so TypeScript enforces that keys are translated to strings. |
| [pushEvent](functions/pushEvent.md)                                     | -                                                                                                                                                                           |
| [setTestMode](functions/setTestMode.md)                                 | -                                                                                                                                                                           |
| [showError](functions/showError.md)                                     | -                                                                                                                                                                           |
| [showInfo](functions/showInfo.md)                                       | -                                                                                                                                                                           |
| [useClientCommon](functions/useClientCommon.md)                         | Get the common context for a product event.                                                                                                                                 |
