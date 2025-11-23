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

- Copy template files and rename placeholders.
  - Upsert **.gitkeep** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/proto-templates/dist/.gitkeep)
  - Upsert **envelope.proto** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/proto-templates/protos/envelope.proto)
  - Upsert **index.proto** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/proto-templates/protos/health/index.proto)
  - Upsert **get-health.proto** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/proto-templates/protos/health/get-health.proto)
  - Upsert **env.schema.json** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/proto-templates/env.schema.json)
  - Upsert **generate.sh** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/proto-templates/generate.sh)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/proto-templates/index.ts)
  - Upsert **package.json** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/proto-templates/package.json)
  - Upsert **tsconfig.json** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/proto-templates/tsconfig.json)
  - Upsert **typedoc.json** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/proto-templates/typedoc.json)
  - Upsert **vitest.config.js** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/proto-templates/vitest.config.js)
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
