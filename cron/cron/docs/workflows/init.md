# cron/init

## Source

[init.ts](https://github.com/sderickson/saflib/blob/main/cron/cron/workflows/init.ts)

## Usage

```bash
npm exec saf-workflow kickoff cron/init <name> <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **cron.ts** from [template](https://github.com/sderickson/saflib/blob/main/cron/cron/workflows/templates/cron.ts)
  - Upsert **cron.test.ts** from [template](https://github.com/sderickson/saflib/blob/main/cron/cron/workflows/templates/cron.test.ts)
  - Upsert **package.json** from [template](https://github.com/sderickson/saflib/blob/main/cron/cron/workflows/templates/package.json)
  - Upsert **tsconfig.json** from [template](https://github.com/sderickson/saflib/blob/main/cron/cron/workflows/templates/tsconfig.json)
  - Upsert **vitest.config.js** from [template](https://github.com/sderickson/saflib/blob/main/cron/cron/workflows/templates/vitest.config.js)
- Change working directory to services/my-service/my-service-cron
- Run `npm install`
- Run `npm test`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff cron/init <name> <path>

Create a new cron service with job scheduling capabilities

Arguments:
  name        Name of the new cron service (e.g., 'my-cron-service')
              Example: "my-service-cron"
  path        Path where the cron service should be created
              Example: "./services/my-service/my-service-cron"

```
