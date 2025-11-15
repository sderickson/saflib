# grpc/init-client

## Source

[init-client.ts](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/init-client.ts)

## Usage

```bash
npm exec saf-workflow kickoff grpc/init-client <name> <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **package.json** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/client-templates/package.json)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/client-templates/index.ts)
  - Upsert **env.ts** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/client-templates/env.ts)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/client-templates/rpcs/health/index.ts)
  - Upsert **get-health.fake.ts** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/client-templates/rpcs/health/get-health.fake.ts)
  - Upsert **tsconfig.json** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/client-templates/tsconfig.json)
- Change working directory to identity/identity-grpc-client
- Run `npm exec saf-env generate`
- Run `npm run typecheck`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff grpc/init-client <name> <path>

Initialize a new gRPC client package

Arguments:
  name        The name of the gRPC client package to create (e.g., 'identity-grpc-client' or 'secrets-grpc-client')
              Example: "example-grpc-client"
  path        The path to the target directory for the gRPC client package (e.g., './identity/identity-grpc-client')
              Example: "./identity/identity-grpc-client"

```
