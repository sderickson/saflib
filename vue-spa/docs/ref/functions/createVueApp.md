[**@saflib/vue-spa**](../index.md)

***

# Function: createVueApp()

> **createVueApp**(`Application`, `__namedParameters`): `App`\<`Element`\>

Wrapper around vue's `createApp` function. Handles SAF-required plugins.

Sets up:
- Vuetify
- Vue Router
- Tanstack Query
- Vue I18n

## Parameters

| Parameter | Type |
| ------ | ------ |
| `Application` | `Component` |
| `__namedParameters` | [`CreateVueAppOptions`](../interfaces/CreateVueAppOptions.md) |

## Returns

`App`\<`Element`\>
