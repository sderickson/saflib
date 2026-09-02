[**@saflib/playwright**](../index.md)

---

# Function: chooseVuetifySelectOption()

> **chooseVuetifySelectOption**(`page`, `label`, `option`): `Promise`\<`void`\>

The Vuetify select component is a bit tricky with Playwright, so this is a convenience function for choosing an option.
Matches when the option label contains `option`, or when `option` contains the visible label
(handles truncated dropdown text ending in `…`). Waits for options to appear after open
(async item sources like form pickers).

## Parameters

| Parameter | Type     |
| --------- | -------- |
| `page`    | `Page`   |
| `label`   | `string` |
| `option`  | `string` |

## Returns

`Promise`\<`void`\>
