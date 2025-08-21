[**@saflib/grpc**](../../../../index.md)

***

# Function: runTestServer()

> **runTestServer**\<`S`\>(`service`): `Promise`\<`string`\>

Runs a gRPC server for testing. Handles if fake timers are in use (which tends to break the server).

## Type Parameters

| Type Parameter |
| ------ |
| `S` *extends* `Server` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `service` | `S` |

## Returns

`Promise`\<`string`\>
