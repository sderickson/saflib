[**@saflib/vue**](../../../index.md)

---

# @saflib/vue/testing

Testing utilities for Vue.

## Interfaces

| Interface                                                        | Description                                  |
| ---------------------------------------------------------------- | -------------------------------------------- |
| [MountWithPluginsOptions](interfaces/MountWithPluginsOptions.md) | Options for the `mountWithPlugins` function. |

## Functions

| Function                                              | Description                                                                                                      |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [getElementByString](functions/getElementByString.md) | This should always be used to find elements in tests.                                                            |
| [mountWithPlugins](functions/mountWithPlugins.md)     | Mount a Vue component with plugins. Handles plugins like vuetify, router, and i18n. Uses `mount` under the hood. |
| [stubGlobals](functions/stubGlobals.md)               | Call during test setup to stub browser globals like ResizeObserver, matchMedia, location, and visualViewport.    |
| [withVueQuery](functions/withVueQuery.md)             | Helper function to test Vue Query composables in isolation.                                                      |
