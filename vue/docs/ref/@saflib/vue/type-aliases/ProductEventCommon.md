[**@saflib/vue**](../../../index.md)

---

# Type Alias: ProductEventCommon

> **ProductEventCommon** = `object`

Common fields for all product events.

## Properties

### client?

> `optional` **client**: `string`

The frontend client that triggered the event. For web, it should be "web-{spa-name}".

---

### component?

> `optional` **component**: `string`

The component that triggered the event. For vue, it should be the component name.

---

### context?

> `optional` **context**: `Record`\<`string`, `unknown`\>

The context for the event.

---

### event

> **event**: `string`

The event name.

---

### view?

> `optional` **view**: `string`

The page that triggered the event. For vue, it should be the route name provided by vue router.
