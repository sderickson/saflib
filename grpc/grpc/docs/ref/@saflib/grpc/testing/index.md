[**@saflib/grpc**](../../../index.md)

***

# @saflib/grpc/testing

Utilities for testing gRPC services.

## Functions

| Function | Description |
| ------ | ------ |
| [resolveGrpcRequest](functions/resolveGrpcRequest.md) | Resolves a gRPC request, waiting for the server to start and checking that the request was successful. Moves fake timers forward if necessary. |
| [runTestServer](functions/runTestServer.md) | Runs a gRPC server for testing. Handles if fake timers are in use (which tends to break the server). |
