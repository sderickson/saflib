# jobs/init

## Source

[init.ts](https://github.com/sderickson/saflib/blob/main/jobs/jobs/workflows/init.ts)

## Usage

```bash
npm exec saf-workflow kickoff jobs/init <parent>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Upsert 6 templates.
- Change working directory to service/jobs
- Run `npm install`
- Verify jobs weave:

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff jobs/init <parent>

Ensure the product jobs package exists (http/monolith jobs wiring ships with
   product/init)

Arguments:
  parent      Optional path to the product root (default: cwd). Ensures service/jobs exists and weaves jobs into http + monolith.
              Example: "."

```
