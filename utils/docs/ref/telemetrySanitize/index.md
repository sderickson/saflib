[**@saflib/utils**](../index.md)

---

# telemetrySanitize

## Type Aliases

| Type Alias                                                     | Description |
| -------------------------------------------------------------- | ----------- |
| [TelemetryEventPayload](type-aliases/TelemetryEventPayload.md) | -           |
| [TelemetryHttpRequest](type-aliases/TelemetryHttpRequest.md)   | -           |

## Variables

| Variable                                                                          | Description                                                                  |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [TELEMETRY_FILTERED_VALUE](variables/TELEMETRY_FILTERED_VALUE.md)                 | Value substituted for sensitive telemetry fields (cookies, Vue props, etc.). |
| [TELEMETRY_OMITTED_CONTEXT_KEYS](variables/TELEMETRY_OMITTED_CONTEXT_KEYS.md)     | Context keys omitted from client error telemetry (may contain PII).          |
| [TELEMETRY_SENSITIVE_COOKIE_NAMES](variables/TELEMETRY_SENSITIVE_COOKIE_NAMES.md) | Cookie names that must never be sent to external telemetry vendors.          |

## Functions

| Function                                                                    | Description                                                                         |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [omitTelemetryContextKeys](functions/omitTelemetryContextKeys.md)           | -                                                                                   |
| [sanitizeTelemetryCookieHeader](functions/sanitizeTelemetryCookieHeader.md) | -                                                                                   |
| [sanitizeTelemetryCookieMap](functions/sanitizeTelemetryCookieMap.md)       | -                                                                                   |
| [sanitizeTelemetryEvent](functions/sanitizeTelemetryEvent.md)               | Scrub sensitive HTTP and Vue context fields before forwarding to telemetry vendors. |
| [sanitizeTelemetryExtra](functions/sanitizeTelemetryExtra.md)               | -                                                                                   |
| [sanitizeTelemetryHttpRequest](functions/sanitizeTelemetryHttpRequest.md)   | -                                                                                   |
