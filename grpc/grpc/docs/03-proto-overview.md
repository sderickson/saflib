# Proto Overview

This package contains Protocol Buffer definitions and generated TypeScript code for RPC services using SAF.

## Prerequisites

You need the Protocol Buffers compiler (protoc) installed to generate TypeScript code from the proto definitions:

- macOS: `brew install protobuf`
- Linux: `apt-get install protobuf-compiler`
- Windows: Download from [protobuf releases](https://github.com/protocolbuffers/protobuf/releases)

## Usage

It's a bit janky. Right now to get this to work, you basically should copy [@saflib/identity-rpcs](https://github.com/sderickson/saflib/tree/main/identity/identity-rpcs) and adjust.

A full package includes:

- `generate.sh` - a custom script for generating the TypeScript code from the proto files.
- `protos/` - the proto files, one for each service.
- `env.schema.json` - include the env variable for the grpc port.
- `env.ts` - generated from the schema with `npm exec saf-env generate`.
- `index.ts` - exports the generated code and types, and returns a client that is mocked if `NODE_ENV` is `"test"`.
- `package.json` - includes `generate` script which cleans the `dist` folder and runs `generate.sh`.

## Defining RPCs and Services

Each request should include `SafAuth` and `SafRequest`.

Each response should return `oneOf` either a successful response or an error.
