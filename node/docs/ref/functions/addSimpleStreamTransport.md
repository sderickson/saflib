[**@saflib/node**](../index.md)

***

# Function: addSimpleStreamTransport()

> **addSimpleStreamTransport**(`fn`): `void`

Adds a simple stream transport to the base logger.
This is mainly used for testing; e.g. pass in a vi.fn().
Call `removeAllSimpleStreamTransports()` when done to clean up.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `fn` | (`message`) => `boolean` | A function that takes a log message and returns a boolean. |

## Returns

`void`
