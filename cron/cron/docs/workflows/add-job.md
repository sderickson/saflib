# cron/add-job

## Source

[add-job.ts](https://github.com/sderickson/saflib/blob/main/cron/cron/workflows/add-job.ts)

## Usage

```bash
npm exec saf-workflow kickoff cron/add-job <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **example-job.ts** from [template](https://github.com/sderickson/saflib/blob/main/cron/cron/workflows/templates/jobs/__group-name__/__target-name__.ts)
  - Upsert **example-job.test.ts** from [template](https://github.com/sderickson/saflib/blob/main/cron/cron/workflows/templates/jobs/__group-name__/__target-name__.test.ts)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/cron/cron/workflows/templates/jobs/__group-name__/index.ts)
  - Upsert **cron.ts** from [template](https://github.com/sderickson/saflib/blob/main/cron/cron/workflows/templates/cron.ts)
- Implement the example-job cron job handler. Make sure to:
- Add the new job to the rest of the package.
- Update the generated example-job.test.ts file to test the cron job functionality.
- Run `npm run typecheck`
- Run `npm run test`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff cron/add-job <path>

Add a new cron job to the service.

Arguments:
  path        Path of the new cron job (e.g., 'jobs/notifications/send-reminders')
              Example: "./jobs/example-group/example-job.ts"

```
