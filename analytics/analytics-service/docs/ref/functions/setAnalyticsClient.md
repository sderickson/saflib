[**@saflib/analytics-service**](../index.md)

---

# Function: setAnalyticsClient()

> **setAnalyticsClient**(`client`): `void`

Sets the process-level analytics client. Idempotent — subsequent calls are no-ops.
Vendor packages (e.g. `@saflib/vendors-posthog`) call this from their configure helpers.

## Parameters

| Parameter | Type                                                    |
| --------- | ------------------------------------------------------- |
| `client`  | [`AnalyticsService`](../interfaces/AnalyticsService.md) |

## Returns

`void`
