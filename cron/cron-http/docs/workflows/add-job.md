# cron/add-job

## Source

[add-job.ts](https://github.com/sderickson/saflib/blob/main/cron/cron-http/workflows/add-job.ts)

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

- Upsert 5 templates.
- Finalize the example-job declarative JobConfig. Make sure to:
- Add the new job to the rest of the package.
- Update the generated example-job.test.ts file to assert the declarative JobConfig.
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
