[**@saflib/node**](../index.md)

---

# Function: createLogger()

> **createLogger**(`options?`): `Logger`

Creates a child logger with the specified request ID. Any servers or processors
should use this to create a unique logger for each request or job or what have you.
However, if not "instantiating" the request, you should use the request ID provided
by the caller, such as in the proto envelope, so that requests which span processes
can be correlated.

## Parameters

| Parameter  | Type                                              |
| ---------- | ------------------------------------------------- |
| `options?` | [`LoggerOptions`](../interfaces/LoggerOptions.md) |

## Returns

`Logger`
