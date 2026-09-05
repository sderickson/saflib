# grpc/init-proto

## Source

[init-proto.ts](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/init-proto.ts)

## Usage

```bash
npm exec saf-workflow kickoff grpc/init-proto <name> <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Upsert 11 templates.
- Change working directory to grpc/example-grpc-proto
- Run `npm run generate`
- Run `npm exec saf-env generate`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff grpc/init-proto <name> <path>

Create a new protocol buffer package

Arguments:
  name        The name of the protocol buffer package to create (e.g., 'secrets-grpc-proto')
              Example: "@example-org/example-grpc-proto"
  path        The relative path where the package should be created (e.g., 'grpc/example-grpc-proto')
              Example: "grpc/example-grpc-proto"

```
