[**@saflib/analytics-service**](../index.md)

---

# Abstract Class: AnalyticsServiceBase

Shared server-side analytics behavior: merges `getSafContext()`-derived fields into every
`capture` payload so all integrations (PostHog, in-memory, etc.) stay consistent.

## Extended by

- [`InMemoryAnalyticsService`](InMemoryAnalyticsService.md)

## Implements

- [`AnalyticsService`](../interfaces/AnalyticsService.md)

## Constructors

### Constructor

> **new AnalyticsServiceBase**(): `AnalyticsServiceBase`

#### Returns

`AnalyticsServiceBase`

## Methods

### capture()

> **capture**(`event`): `void`

#### Parameters

| Parameter | Type                                          |
| --------- | --------------------------------------------- |
| `event`   | [`CommonEvent`](../interfaces/CommonEvent.md) |

#### Returns

`void`

#### Implementation of

[`AnalyticsService`](../interfaces/AnalyticsService.md).[`capture`](../interfaces/AnalyticsService.md#capture)

---

### emitCapture()

> `abstract` `protected` **emitCapture**(`event`): `void`

#### Parameters

| Parameter          | Type                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `event`            | \{ `context?`: `Record`\<`string`, `unknown`\>; `distinctId`: `string`; `event`: `string`; \} |
| `event.context?`   | `Record`\<`string`, `unknown`\>                                                               |
| `event.distinctId` | `string`                                                                                      |
| `event.event`      | `string`                                                                                      |

#### Returns

`void`

---

### getCapturePropertiesFromSafContext()

> `protected` **getCapturePropertiesFromSafContext**(`ctx`): `Record`\<`string`, `unknown`>\>

Fields merged under capture `context` / PostHog `properties` from the current SafContext.
Subclasses do not override this for normal HTTP use; extend only if you add more keys.

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `ctx`     | `SafContext` |

#### Returns

`Record`\<`string`, `unknown`\>

---

### identify()

> `abstract` **identify**(`props`): `void`

#### Parameters

| Parameter | Type                                              |
| --------- | ------------------------------------------------- |
| `props`   | [`IdentifyProps`](../interfaces/IdentifyProps.md) |

#### Returns

`void`

#### Implementation of

[`AnalyticsService`](../interfaces/AnalyticsService.md).[`identify`](../interfaces/AnalyticsService.md#identify)

---

### shutdown()

> `abstract` **shutdown**(): `void` \| `Promise`\<`void`>\>

#### Returns

`void` \| `Promise`\<`void`\>

#### Implementation of

[`AnalyticsService`](../interfaces/AnalyticsService.md).[`shutdown`](../interfaces/AnalyticsService.md#shutdown)
