# grpc/init-server

## Source

[init-server.ts](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/init-server.ts)

## Usage

```bash
npm exec saf-workflow kickoff grpc/init-server <name> <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **health-check.test.ts** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/server-templates/handlers/health/health-check.test.ts)
  - Upsert **health-check.ts** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/server-templates/handlers/health/health-check.ts)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/server-templates/handlers/health/index.ts)
  - Upsert **package.json** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/server-templates/package.json)
  - Upsert **grpc.ts** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/server-templates/grpc.ts)
  - Upsert **tsconfig.json** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/server-templates/tsconfig.json)
  - Upsert **vitest.config.js** from [template](https://github.com/sderickson/saflib/blob/main/grpc/grpc/workflows/server-templates/vitest.config.js)
- Change working directory to grpc/example-grpc-server
- Run `npm install example-grpc-proto`
- Run `npm run typecheck`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff grpc/init-server <name> <path>

Create a new gRPC service package

Arguments:
  name        The name of the gRPC service package to create (e.g., 'secrets-grpc-server')
              Example: "@example-org/example-grpc-server"
  path        The relative path where the package should be created (e.g., 'grpc/example-grpc-server')
              Example: "grpc/example-grpc-server"

```
