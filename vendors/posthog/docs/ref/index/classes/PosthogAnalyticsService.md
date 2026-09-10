[**@saflib/vendors-posthog**](../../index.md)

---

# Class: PosthogAnalyticsService

## Extends

- `AnalyticsServiceBase`

## Constructors

### Constructor

> **new PosthogAnalyticsService**(`options`): `PosthogAnalyticsService`

#### Parameters

| Parameter | Type                                                                                  |
| --------- | ------------------------------------------------------------------------------------- |
| `options` | [`PosthogAnalyticsServiceOptions`](../type-aliases/PosthogAnalyticsServiceOptions.md) |

#### Returns

`PosthogAnalyticsService`

#### Overrides

`AnalyticsServiceBase.constructor`

## Methods

### capture()

> **capture**(`event`): `void`

#### Parameters

| Parameter | Type          |
| --------- | ------------- |
| `event`   | `CommonEvent` |

#### Returns

`void`

#### Inherited from

`AnalyticsServiceBase.capture`

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

`AnalyticsServiceBase.emitCapture`

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

`AnalyticsServiceBase.getCapturePropertiesFromSafContext`

---

### identify()

> **identify**(`props`): `void`

#### Parameters

| Parameter | Type            |
| --------- | --------------- |
| `props`   | `IdentifyProps` |

#### Returns

`void`

#### Overrides

`AnalyticsServiceBase.identify`

---

### shutdown()

> **shutdown**(): `void` \| `Promise`\<`void`>\>

#### Returns

`void` \| `Promise`\<`void`\>

#### Overrides

`AnalyticsServiceBase.shutdown`
