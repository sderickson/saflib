[**@saflib/vendors-sentry-client**](../index.md)

---

# Function: identifyToSentry()

> **identifyToSentry**(`session`): `void`

Associate the current Kratos session with Sentry error reports. Call when the
session becomes available (e.g. from the app shell on load), mirroring
identifyToPostHog. Only the user id is sent — no email or name.

## Parameters

| Parameter | Type      |
| --------- | --------- |
| `session` | `Session` |

## Returns

`void`
