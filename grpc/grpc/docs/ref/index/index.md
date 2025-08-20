[**@saflib/grpc**](../index.md)

***

# index

## Interfaces

| Interface | Description |
| ------ | ------ |
| [GrpcServerOptions](interfaces/GrpcServerOptions.md) | Options when starting a gRPC server. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [ServiceImplementationWrapper](type-aliases/ServiceImplementationWrapper.md) | Helper type for a function which wraps a gRPC service. |

## Functions

| Function | Description |
| ------ | ------ |
| [addSafContext](functions/addSafContext.md) | Takes a gRPC service and wraps it to provide SafContext and SafReporters for each request. |
| [makeGrpcServerContextWrapper](functions/makeGrpcServerContextWrapper.md) | Takes a storage and context and returns a function which will wrap a gRPC service implementation and provide the given storage/context for each request. It returns a wrapper function so it can be used for each service added to the gRPC server, which presumably all need the same context and storage. |
| [startGrpcServer](functions/startGrpcServer.md) | Start a gRPC server with options, shutting it down on SIGTERM and SIGINT. |
