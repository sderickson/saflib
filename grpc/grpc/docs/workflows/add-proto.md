# grpc/add-proto

## Source

[add-proto.ts](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/add-proto.ts)

## Usage

```bash
npm exec saf-workflow kickoff grpc/add-proto <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **index.proto** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/proto-templates/protos/__group_name__/index.proto)
  - Upsert **list.proto** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/proto-templates/protos/__group_name__/__target-name__.proto)
- Update **list.proto** to implement the RPC request and response messages. Define the appropriate fields for your RPC.
- Update **index.proto** to add the new RPC method to the service. The RPC should follow the pattern: rpc MethodName(RequestMessage) returns (ResponseMessage);
- Run `npm run generate`
- Update the root index.ts file to import the generated grpc service and client, if it doesn't already.

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff grpc/add-proto <path>

Add a new RPC to a proto file

Arguments:
  path        The path to the proto file to be created (e.g., './protos/secrets/list.proto')
              Example: "./protos/secrets/list.proto"

```
