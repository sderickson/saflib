[**@saflib/sdk**](../../../index.md)

---

# Function: createCredentialsEventSource()

> **createCredentialsEventSource**(`url`, `handlers`, `reconnectMs?`): [`CredentialsEventSource`](../type-aliases/CredentialsEventSource.md)

Long-lived SSE subscription with session cookies. Reconnects on drop/errors
until [CredentialsEventSource.close](../type-aliases/CredentialsEventSource.md#close).

## Parameters

| Parameter      | Type                                                                                  |
| -------------- | ------------------------------------------------------------------------------------- |
| `url`          | `string`                                                                              |
| `handlers`     | [`CredentialsEventSourceHandlers`](../type-aliases/CredentialsEventSourceHandlers.md) |
| `reconnectMs?` | `number`                                                                              |

## Returns

[`CredentialsEventSource`](../type-aliases/CredentialsEventSource.md)
