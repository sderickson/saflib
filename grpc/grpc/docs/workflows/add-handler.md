# grpc/add-handler

## Source

[add-handler.ts](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/add-handler.ts)

## Usage

```bash
npm exec saf-workflow kickoff grpc/add-handler <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

Kicking off workflow grpc/add-handler

- Upsert 3 templates.
- Implement the get-secret gRPC handler. Make sure to:
- Update the main grpc.ts file to register the saflib service if it's not already there.

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff grpc/add-handler <path>

Implement a gRPC handler for a service

Arguments:
  path        The path to the gRPC service package (e.g., './handlers/secrets/get-secret.ts')
              Example: "./handlers/secrets/get-secret.ts"

```
