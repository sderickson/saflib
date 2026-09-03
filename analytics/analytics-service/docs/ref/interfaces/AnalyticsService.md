[**@saflib/analytics-service**](../index.md)

---

# Interface: AnalyticsService

Server-side analytics client. Concrete implementations should extend
`AnalyticsServiceBase` so each `capture` uses `getSafContext().auth.userId` as PostHog distinct id
and enriches payloads from SafContext (e.g. HTTP `host`).

## Properties

### capture()

> **capture**: (`event`) => `void`

#### Parameters

| Parameter | Type                            |
| --------- | ------------------------------- |
| `event`   | [`CommonEvent`](CommonEvent.md) |

#### Returns

`void`

---

### identify()

> **identify**: (`props`) => `void`

#### Parameters

| Parameter | Type                                |
| --------- | ----------------------------------- |
| `props`   | [`IdentifyProps`](IdentifyProps.md) |

#### Returns

`void`

---

### shutdown()

> **shutdown**: () => `void` \| `Promise`\<`void`>\>

#### Returns

`void` \| `Promise`\<`void`\>
