[**@saflib/vue**](../../../index.md)

---

# @saflib/vue/testing

Testing utilities for Vue.

## Interfaces

| Interface                                                                | Description                                  |
| ------------------------------------------------------------------------ | -------------------------------------------- |
| [CreateSpaTestHelpersOptions](interfaces/CreateSpaTestHelpersOptions.md) | -                                            |
| [MountWithPluginsOptions](interfaces/MountWithPluginsOptions.md)         | Options for the `mountWithPlugins` function. |

## Type Aliases

| Type Alias                                                 | Description |
| ---------------------------------------------------------- | ----------- |
| [ExtractRequestQuery](type-aliases/ExtractRequestQuery.md) | -           |

## Variables

| Variable                                                    | Description                                                                                                                                                                                                                |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [asyncUiWaitForOptions](variables/asyncUiWaitForOptions.md) | Pass to `vi.waitFor(..., options)` for tests that mount AsyncPage, MSW-backed queries, and/or async route chunks. Vitest’s default waitFor timeout is 1000ms, which often flakes under parallel CI or CPU/memory pressure. |

## Functions

| Function                                                  | Description                                                                                                      |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [createSpaTestHelpers](functions/createSpaTestHelpers.md) | Shared `createTestRouter` / `mountTestApp` pair used by product SPA packages.                                    |
| [getElementByString](functions/getElementByString.md)     | This should always be used to find elements in tests.                                                            |
| [mountWithPlugins](functions/mountWithPlugins.md)         | Mount a Vue component with plugins. Handles plugins like vuetify, router, and i18n. Uses `mount` under the hood. |
| [stubGlobals](functions/stubGlobals.md)                   | Call during test setup to stub browser globals like ResizeObserver, matchMedia, location, and visualViewport.    |
| [typedCreateHandler](functions/typedCreateHandler.md)     | Use to create a typed helper function for creating typesafe mock API handlers.                                   |
| [withVueQuery](functions/withVueQuery.md)                 | Helper function to test Vue Query composables in isolation.                                                      |
