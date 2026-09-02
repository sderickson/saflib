[**@saflib/vue**](../../../index.md)

---

# Interface: CreateSpaMainOptions

## Properties

### asyncPageError?

> `optional` **asyncPageError**: `AsyncPageErrorComponent`

---

### beforeMount()?

> `optional` **beforeMount**: () => `void`

Runs after client name / title setup, before `createVueApp`.

#### Returns

`void`

---

### callback()?

> `optional` **callback**: (`app`) => `void`

#### Parameters

| Parameter | Type               |
| --------- | ------------------ |
| `app`     | `App`\<`Element`\> |

#### Returns

`void`

---

### clientName

> **clientName**: `string`

Passed to setClientName (e.g. `"app"`, `"admin"`).

---

### createRouter()

> **createRouter**: () => `RouterClassic`

#### Returns

`RouterClassic`

---

### spa

> **spa**: `Component`

---

### strings

> **strings**: [`I18nMessages`](I18nMessages.md)

---

### title?

> `optional` **title**: `string`

When set, updates `document.title` via [configureAppDocumentTitle](../functions/configureAppDocumentTitle.md).

---

### vuetifyConfig?

> `optional` **vuetifyConfig**: `VuetifyOptions`
