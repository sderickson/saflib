# add-workflow

## Source

[add-workflow.ts](https://github.com/sderickson/saflib/blob/main/workflows/workflows/add-workflow.ts)

## Usage

```bash
npm exec saf-workflow kickoff add-workflow <name>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

* Copy template files and rename placeholders.
  * Create index.ts from [template](https://github.com/sderickson/saflib/blob/main/workflows/workflows/add-workflow.templates/index.ts)
  * Create example-workflow.ts from [template](https://github.com/sderickson/saflib/blob/main/workflows/workflows/add-workflow.templates/example-workflow.ts)


## Help Docs

```bash
Usage: saf-workflow kickoff add-workflow [options] <name>

Create a new workflow

Arguments:
  name        The name of the new workflow to create (e.g.,
              'refactor-component')

Options:
  -h, --help  display help for command

```
