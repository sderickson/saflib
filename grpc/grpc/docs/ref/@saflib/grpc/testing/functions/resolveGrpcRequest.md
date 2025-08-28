[**@saflib/grpc**](../../../../index.md)

---

# Function: resolveGrpcRequest()

> **resolveGrpcRequest**\<`T`\>(`p`): `Promise`\<`T`\>

Resolves a gRPC request, waiting for the server to start and checking that the request was successful.
Moves fake timers forward if necessary.

## Type Parameters

| Type Parameter         |
| ---------------------- |
| `T` _extends_ `object` |

## Parameters

| Parameter | Type             |
| --------- | ---------------- |
| `p`       | `Promise`\<`T`\> |

## Returns

`Promise`\<`T`\>
