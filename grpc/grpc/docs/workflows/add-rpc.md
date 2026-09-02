# grpc/add-rpc

## Source

[add-rpc.ts](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/add-rpc.ts)

## Usage

```bash
npm exec saf-workflow kickoff grpc/add-rpc <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

Kicking off workflow grpc/add-rpc

- Upsert 2 templates.
- Update **get-user-profile.fake.ts** to implement the fake RPC handler for testing. Make sure to:
- Update **index.ts** to export the new RPC client and types.
- Update the root index.ts file to export the new RPC client and types from the users group.

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff grpc/add-rpc <path>

Add a new RPC client to a gRPC client package

Arguments:
  path        The path to the RPC client file to be created (e.g., 'rpcs/users/get-user-profile.ts')
              Example: "./rpcs/users/get-user-profile.ts"

```
