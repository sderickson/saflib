# Overview

To make calls between themselves, SAF services use gRPC, for efficiency and backwards compatibility. Use `@saflib/grpc` to run gRPC service implementations.

## Package Status

I haven't used gRPCs nearly as much as other packages in SAF, so gRPC packages are underdeveloped. I have an idea where to take them, but it will take some time and experimentation to get there.

TODOs:

- Figure out how to share generate.sh between packages.
- Nail down what rpc requests and responses should look like, particularly around errors.
- Figure out how to do integration tests without running a grpc server.

## Package Structure

Each package which depends on `@saflib/grpc` should have the following structure:

```
{service-name}-grpc/
├── context.ts
├── grpc.ts
├── rpcs/
│   └── {service-1}/
│   │   ├── index.ts
│   │   ├── get-by-id.test.ts
│   │   ├── get-by-id.ts
│   │   └── ...
│   ├── {service-2}/
│   └── ...
├── package.json
```

## Files and Directories Explained

### `context.ts`

This file contains the [AsyncLocalStorage](https://nodejs.org/api/async_context.html#asynclocalstorageenterwithstore) used by rpcs the gRPC service.

See [@saflib/express](../express/docs/01-overview.md#contextts) for more details.

### `grpc.ts`

This file contains the gRPC service implementation. It should export a function which creates a `grpc.Server` instance. It should:

- Have all grpc services added to it with `server.addService`.
- Wrap all service implementations with `addSafContext` and any service-specific context with `makeGrpcServerContextWrapper`.

It should not start the server.

### `rpcs/`

This directory contains the gRPC service implementations. Each service should have its own directory.

Each service should have an `index.ts` file which exports the service definition and implementation. Each method should have its own file which exports a function typed to the method.

## Related Packages

### Public

To specify the gRPC services a service provides, use [`@saflib/grpc-specs`](../../grpc-specs/docs/overview.md).
