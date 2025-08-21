[**@saflib/grpc**](../../../index.md)

***

# Function: makeGrpcServerContextWrapper()

> **makeGrpcServerContextWrapper**(`storage`, `context`): [`ServiceImplementationWrapper`](../type-aliases/ServiceImplementationWrapper.md)

Takes a storage and context and returns a function which will wrap a gRPC service implementation and provide the given storage/context for each request.
It returns a wrapper function so it can be used for each service added to the gRPC server, which presumably all need the same context and storage.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `storage` | `AsyncLocalStorage`\<`any`\> |
| `context` | `any` |

## Returns

[`ServiceImplementationWrapper`](../type-aliases/ServiceImplementationWrapper.md)
