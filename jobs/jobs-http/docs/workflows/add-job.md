# jobs/add-job

## Source

[add-job.ts](https://github.com/sderickson/saflib/blob/main/jobs/jobs-http/workflows/add-job.ts)

## Usage

```bash
npm exec saf-workflow kickoff jobs/add-job <callerOperationId> <targetOperationId> <cron_job_name>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Upsert 1 template.
- Add trigger-map entries in /jobs.ts:
- Finalize trigger map and operationConfig for jobsDemoStepB.
- Run `npm run typecheck`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff jobs/add-job <callerOperationId> <targetOperationId> <cron_job_name>

Add a trigger-map edge (and optional cron: key) to the product jobs offshoot

Arguments:
  callerOperationIdOpenAPI operation_id allowed to enqueue the new background target (trigger-map key)
              Example: "startJobsDemo"
  targetOperationIdBackground operation_id the caller may enqueue (must exist in spec with background tag)
              Example: "jobsDemoStepB"
  cron_job_nameOptional cron job name when adding a cron: trigger key (omit for HTTP-only edges)
              Example: "jobsDemoKick"

```
