# cron/init

## Source

[init.ts](https://github.com/sderickson/saflib/blob/main/cron/cron-http/workflows/init.ts)

## Usage

```bash
npm exec saf-workflow kickoff cron/init <parent>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Upsert 8 templates.
- Change working directory to service/cron
- Run `npm install`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff cron/init <parent>

Ensure the product cron package exists (http/monolith cron wiring ships with
   product/init)

Arguments:
  parent      Optional path to the product root (default: cwd). Ensures service/cron exists and weaves cron into http + monolith.
              Example: "."

```
