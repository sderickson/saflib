[**@saflib/node**](../index.md)

***

# Function: addTransport()

> **addTransport**(`transport`): `void`

For production, when the application starts, it should add any transports using this function. Then all SAF-based applications will log to winston and they'll propagate to loggers such as Loki.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `transport` | `TransportStream` |

## Returns

`void`
