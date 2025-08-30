[**@saflib/grpc**](../../../index.md)

---

# Function: startGrpcServer()

> **startGrpcServer**(`server`, `options`): `Promise`\<`void`\>

Start a gRPC server with options, shutting it down on SIGTERM and SIGINT.

## Parameters

| Parameter | Type                                                      |
| --------- | --------------------------------------------------------- |
| `server`  | `Server`                                                  |
| `options` | [`GrpcServerOptions`](../interfaces/GrpcServerOptions.md) |

## Returns

`Promise`\<`void`\>
