[**@saflib/analytics-service**](../index.md)

---

# Type Alias: TypedAnalytics\<E\>

> **TypedAnalytics**\<`E`> \> = `Pick`\<[`AnalyticsService`](../interfaces/AnalyticsService.md), `"identify"` \| `"shutdown"`> \> & `object`

## Type declaration

### capture()

> **capture**: (`event`) => `void`

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `event`   | `E`  |

#### Returns

`void`

## Type Parameters

| Type Parameter                                              |
| ----------------------------------------------------------- |
| `E` _extends_ [`CommonEvent`](../interfaces/CommonEvent.md) |
