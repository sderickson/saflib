[**@saflib/vue**](../../../../index.md)

---

# Interface: CreateSpaTestHelpersOptions

## Properties

### clientName?

> `optional` **clientName**: `string`

When set, calls setClientName inside `mountTestApp`.

---

### createRouter()

> **createRouter**: (`options?`) => `RouterClassic`

#### Parameters

| Parameter          | Type                               |
| ------------------ | ---------------------------------- |
| `options?`         | \{ `history?`: `RouterHistory`; \} |
| `options.history?` | `RouterHistory`                    |

#### Returns

`RouterClassic`

---

### strings

> **strings**: [`I18nMessages`](../../interfaces/I18nMessages.md)
