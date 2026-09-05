# workflows/add-workflow

## Source

[add-workflow.ts](https://github.com/sderickson/saflib/blob/main/workflows/workflows/add-workflow.ts)

## Usage

```bash
npm exec saf-workflow kickoff workflows/add-workflow <name>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Upsert 3 templates.
- Update the workflow file to implement the main functionality. Replace any TODO comments with actual implementation.
- Upsert 4 templates.
- Change working directory to ../workflows-cli
- Run `npm install @saflib/docs`
- Run `npm exec saf-workflow checklist example-package/example-workflow`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff workflows/add-workflow <name>

Create a new workflow and adds it to the CLI tool. Stops after setup to wait for
   implementation requirements.

Arguments:
  name        The name of the new workflow to create (e.g., 'refactor-component')
              Example: "example-package/example-workflow"

```
