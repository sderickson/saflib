[**@saflib/analytics-service**](../index.md)

---

# Class: InMemoryAnalyticsService

Shared server-side analytics behavior: merges `getSafContext()`-derived fields into every
`capture` payload so all integrations (PostHog, in-memory, etc.) stay consistent.

## Extends

- [`AnalyticsServiceBase`](AnalyticsServiceBase.md)

## Constructors

### Constructor

> **new InMemoryAnalyticsService**(): `InMemoryAnalyticsService`

#### Returns

`InMemoryAnalyticsService`

#### Inherited from

[`AnalyticsServiceBase`](AnalyticsServiceBase.md).[`constructor`](AnalyticsServiceBase.md#constructor)

## Methods

### capture()

> **capture**(`event`): `void`

#### Parameters

| Parameter | Type                                          |
| --------- | --------------------------------------------- |
| `event`   | [`CommonEvent`](../interfaces/CommonEvent.md) |

#### Returns

`void`

#### Inherited from

[`AnalyticsServiceBase`](AnalyticsServiceBase.md).[`capture`](AnalyticsServiceBase.md#capture)

---

### emitCapture()

> `protected` **emitCapture**(`event`): `void`

#### Parameters

| Parameter          | Type                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `event`            | \{ `context?`: `Record`\<`string`, `unknown`\>; `distinctId`: `string`; `event`: `string`; \} |
| `event.context?`   | `Record`\<`string`, `unknown`\>                                                               |
| `event.distinctId` | `string`                                                                                      |
| `event.event`      | `string`                                                                                      |

#### Returns

`void`

#### Overrides

[`AnalyticsServiceBase`](AnalyticsServiceBase.md).[`emitCapture`](AnalyticsServiceBase.md#emitcapture)

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

#### Inherited from

[`AnalyticsServiceBase`](AnalyticsServiceBase.md).[`getCapturePropertiesFromSafContext`](AnalyticsServiceBase.md#getcapturepropertiesfromsafcontext)

---

### identify()

> **identify**(`props`): `void`

#### Parameters

| Parameter | Type                                              |
| --------- | ------------------------------------------------- |
| `props`   | [`IdentifyProps`](../interfaces/IdentifyProps.md) |

#### Returns

`void`

#### Overrides

[`AnalyticsServiceBase`](AnalyticsServiceBase.md).[`identify`](AnalyticsServiceBase.md#identify)

---

### shutdown()

> **shutdown**(): `void`

#### Returns

`void`

#### Overrides

[`AnalyticsServiceBase`](AnalyticsServiceBase.md).[`shutdown`](AnalyticsServiceBase.md#shutdown)
