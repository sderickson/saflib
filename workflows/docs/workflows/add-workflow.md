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

- Copy template files and rename placeholders.
  - Upsert **example-workflow.ts** from [template](https://github.com/sderickson/saflib/blob/main/workflows/workflows/templates/__target-name__.ts)
  - Upsert **example-workflow.test.ts** from [template](https://github.com/sderickson/saflib/blob/main/workflows/workflows/templates/__target-name__.test.ts)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/workflows/workflows/templates/index.ts)
- Update the workflow file to implement the main functionality. Replace any TODO comments with actual implementation.
- Export **example-workflow** from **blog-client**.
- Add `blog-client`'s exported workflows to the CLI tool.

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff workflows/add-workflow <name>

Create a new workflow and adds it to the CLI tool. Stops after setup to wait for
   implementation requirements.

Arguments:
  name        The name of the new workflow to create (e.g., 'refactor-component')
              Example: "example-package/example-workflow"

```
