[**@saflib/vue**](../../../index.md)

---

# Variable: createVueApp()

> `const` **createVueApp**: (`Application`, `{ router, vuetifyConfig, callback, i18nMessages, asyncPageError, }?`) => `App`

Wrapper around vue's `createApp` function. Handles SAF-required plugins.

Sets up:

- Vuetify
- Vue Router
- Tanstack Query
- Vue I18n

## Parameters

| Parameter                                                             | Type                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------- |
| `Application`                                                         | `Component`                                                   |
| `{ router, vuetifyConfig, callback, i18nMessages, asyncPageError, }?` | [`CreateVueAppOptions`](../interfaces/CreateVueAppOptions.md) |

## Returns

`App`
