[**@saflib/vue**](../../index.md)

---

# @saflib/vue

Common utilities for Vue SPAs and pages.

## Interfaces

| Interface                                                  | Description                                                                                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [CreateSpaMainOptions](interfaces/CreateSpaMainOptions.md) | -                                                                                                                                           |
| [CreateVueAppOptions](interfaces/CreateVueAppOptions.md)   | Options for createVueApp.                                                                                                                   |
| [I18nMessages](interfaces/I18nMessages.md)                 | Generic interface for vue-i18n translation objects supported by SAF.                                                                        |
| [I18NObject](interfaces/I18NObject.md)                     | Interface for flat vue-i18n objects, where each key is a string. Used most commonly for strings which are shared for a single HTML element. |

## Type Aliases

| Type Alias                                                       | Description                                                                                                                                                          |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ErrorSnackbarAction](type-aliases/ErrorSnackbarAction.md)       | Opens in the snackbar action area (not passed through to VSnackbar props).                                                                                           |
| [ErrorSnackbarQueueItem](type-aliases/ErrorSnackbarQueueItem.md) | Queue item for VSnackbarQueue: strings become `{ text }` internally; objects may include `action` for the error snackbar `#actions` slot only.                       |
| [ErrorSnackbarSlotItem](type-aliases/ErrorSnackbarSlotItem.md)   | Row as seen in `VSnackbarQueue` slots: string queue entries are coerced to `{ text }` before render. Vuetify merges in other snackbar props; those are ignored here. |
| [LoaderQueries](type-aliases/LoaderQueries.md)                   | A record of loader queries.                                                                                                                                          |
| [LoaderQuery](type-aliases/LoaderQuery.md)                       | A subset of what `useQuery` returns. This is so that loaders can create pseudo-queries by simply creating objects with isLoading, error, and isError properties.     |
| [ProductEventCommon](type-aliases/ProductEventCommon.md)         | Common fields for all product events.                                                                                                                                |
| [ProductEventConnector](type-aliases/ProductEventConnector.md)   | -                                                                                                                                                                    |
| [ProductEventListener](type-aliases/ProductEventListener.md)     | A function that receives product events as they're emitted.                                                                                                          |
| [ShowErrorInput](type-aliases/ShowErrorInput.md)                 | -                                                                                                                                                                    |
| [TestMode](type-aliases/TestMode.md)                             | -                                                                                                                                                                    |

## Variables

| Variable                                                              | Description |
| --------------------------------------------------------------------- | ----------- |
| [DEFAULT_APP_DOCUMENT_TITLE](variables/DEFAULT_APP_DOCUMENT_TITLE.md) | -           |
| [errors](variables/errors.md)                                         | -           |
| [events](variables/events.md)                                         | -           |
| [info](variables/info.md)                                             | -           |
| [testMode](variables/testMode.md)                                     | -           |

## Functions

| Function                                                                    | Description                                                                                                                                                                                                      |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [commonEventLogger](functions/commonEventLogger.md)                         | -                                                                                                                                                                                                                |
| [configureAppDocumentTitle](functions/configureAppDocumentTitle.md)         | Set the app name appended to page titles, e.g. `Home — ExampleApp`.                                                                                                                                              |
| [createSpaMain](functions/createSpaMain.md)                                 | Standard SPA entry: client name → optional title → router → `createVueApp`.                                                                                                                                      |
| [createVueApp](functions/createVueApp.md)                                   | Wrapper around vue's `createApp` function. Handles SAF-required plugins.                                                                                                                                         |
| [formatDocumentTitle](functions/formatDocumentTitle.md)                     | -                                                                                                                                                                                                                |
| [getAppDocumentTitle](functions/getAppDocumentTitle.md)                     | -                                                                                                                                                                                                                |
| [getEvents](functions/getEvents.md)                                         | -                                                                                                                                                                                                                |
| [hideVueDevToolsIfInTestMode](functions/hideVueDevToolsIfInTestMode.md)     | -                                                                                                                                                                                                                |
| [isDevelopmentDeployment](functions/isDevelopmentDeployment.md)             | Local development deployment (`DEPLOYMENT_NAME=development`), injected at build time.                                                                                                                            |
| [isDevEnv](functions/isDevEnv.md)                                           | -                                                                                                                                                                                                                |
| [isTestEnv](functions/isTestEnv.md)                                         | -                                                                                                                                                                                                                |
| [isTestMode](functions/isTestMode.md)                                       | -                                                                                                                                                                                                                |
| [makeProductEventLogger](functions/makeProductEventLogger.md)               | Create centralized object to emit and listen to product events. Provide a product event type to ensure type safety, produced as part of the API spec.                                                            |
| [makeReverseTComposable](functions/makeReverseTComposable.md)               | Creates an alternative to Vue I18n's $t function, which takes the English text instead of a key. This is mainly so TypeScript enforces that keys are translated to strings.                                      |
| [pushEvent](functions/pushEvent.md)                                         | -                                                                                                                                                                                                                |
| [registerProductEventConnector](functions/registerProductEventConnector.md) | Register an optional sink for [commonEventLogger](functions/commonEventLogger.md) (PostHog init, dev backend ring buffer, etc.). Connectors run after built-in globals (gtag, posthog global, test-mode cookie). |
| [setDocumentTitle](functions/setDocumentTitle.md)                           | -                                                                                                                                                                                                                |
| [setTestMode](functions/setTestMode.md)                                     | -                                                                                                                                                                                                                |
| [showError](functions/showError.md)                                         | -                                                                                                                                                                                                                |
| [showInfo](functions/showInfo.md)                                           | -                                                                                                                                                                                                                |
| [useAsyncPageDocumentTitle](functions/useAsyncPageDocumentTitle.md)         | Set `document.title` from an Async page shell using strings + optional loader data.                                                                                                                              |
| [useAsyncPageErrorComponent](functions/useAsyncPageErrorComponent.md)       | -                                                                                                                                                                                                                |
| [useClientCommon](functions/useClientCommon.md)                             | Get the common context for a product event.                                                                                                                                                                      |
| [useResolvedHref](functions/useResolvedHref.md)                             | Resolves a multi-subdomain href for use in prerendered (SSG) Vue pages.                                                                                                                                          |
