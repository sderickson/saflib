# integrations/add-call

## Source

[add-call.ts](https://github.com/sderickson/saflib/blob/main/integrations/workflows/add-call.ts)

## Usage

```bash
npm exec saf-workflow kickoff integrations/add-call <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Upsert 4 templates.
- Implement the **example-call** call in **/Users/scott/src/saf-2025/saflib/analytics/analytics-http/calls/example-call.ts**.
- Update the bin script to call the implementation with appropriate test arguments. The script should demonstrate a realistic invocation so you can verify the call works end-to-end with `npm run <script-name>`.
- Add "example-call" script to package.json
- Run `npm run typecheck`
- Run `npm run test`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff integrations/add-call <path>

Add a new call to an integration package with implementation, mock, and bin
   script

Arguments:
  path        Path of the new call (e.g., './calls/parse-file.ts')
              Example: "./calls/example-call.ts"

```
