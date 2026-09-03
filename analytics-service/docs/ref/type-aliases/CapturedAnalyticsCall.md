[**@saflib/analytics-service**](../index.md)

---

# Type Alias: CapturedAnalyticsCall

> **CapturedAnalyticsCall** = \{ `context?`: `Record`\<`string`, `unknown`>\>; `distinctId`: `string`; `event`: `string`; `kind`: `"capture"`; \} \| \{ `disableGeoip?`: `boolean`; `distinctId`: `string`; `kind`: `"identify"`; `properties?`: `Record`\<`string`, `unknown`>\>; \}
