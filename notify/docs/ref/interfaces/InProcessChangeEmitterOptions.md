[**@saflib/notify**](../index.md)

---

# Interface: InProcessChangeEmitterOptions

## Properties

### maxEventAgeMs?

> `optional` **maxEventAgeMs**: `number`

Drop buffered events older than this (default [RING\_BUFFER\_MAX\_AGE\_MS](../variables/RING_BUFFER_MAX_AGE_MS.md)).

---

### maxEventsPerOrg?

> `optional` **maxEventsPerOrg**: `number`

Max events retained per org (default [RING\_BUFFER\_MAX\_EVENTS](../variables/RING_BUFFER_MAX_EVENTS.md)).

---

### now()?

> `optional` **now**: () => `number`

Clock for expiry; inject in tests.

#### Returns

`number`
