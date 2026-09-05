[**@saflib/sdk**](../../../index.md)

---

# Type Alias: CredentialsEventSourceHandlers

> **CredentialsEventSourceHandlers** = `object`

Cookie-authenticated SSE over `fetch` (`credentials: "include"`).

Native `EventSource` does not send cookies on cross-origin requests (e.g.
`app.*` → `api.*` on the same site). Product SPAs use subdomain-separated API
hosts with session cookies scoped to the registrable domain, so SSE must use
fetch like [createSafClient](../variables/createSafClient.md).

## Properties

### onError()?

> `optional` **onError**: () => `void`

#### Returns

`void`

---

### onEvent()

> **onEvent**: (`type`, `data`, `eventId?`) => `void`

#### Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `type`     | `string` |
| `data`     | `string` |
| `eventId?` | `string` |

#### Returns

`void`

---

### onOpen()?

> `optional` **onOpen**: () => `void`

#### Returns

`void`
