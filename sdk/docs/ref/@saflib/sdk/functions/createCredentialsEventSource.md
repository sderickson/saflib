[**@saflib/sdk**](../../../index.md)

---

# Function: createCredentialsEventSource()

> **createCredentialsEventSource**(`url`, `handlers`, `reconnectMs`): [`CredentialsEventSource`](../type-aliases/CredentialsEventSource.md)

Long-lived SSE subscription with session cookies. Reconnects on drop/errors
until [CredentialsEventSource.close](../type-aliases/CredentialsEventSource.md#close).

## Parameters

| Parameter     | Type                                                                                  | Default value          |
| ------------- | ------------------------------------------------------------------------------------- | ---------------------- |
| `url`         | `string`                                                                              | `undefined`            |
| `handlers`    | [`CredentialsEventSourceHandlers`](../type-aliases/CredentialsEventSourceHandlers.md) | `undefined`            |
| `reconnectMs` | `number`                                                                              | `DEFAULT_RECONNECT_MS` |

## Returns

[`CredentialsEventSource`](../type-aliases/CredentialsEventSource.md)
