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

- Copy template files and rename placeholders.
  - Upsert **example-workflow.ts** from [template](https://github.com/sderickson/saflib/blob/main/workflows/workflows/add-workflow.templates/template-file.ts)
- Add name, description, and cliArguments to the newly created workflows/example-workflow.ts.
- Export **example-workflow** from **@saflib/workflows**.
- Add `@saflib/workflows` as a dependency of `@saflib/workflows-cli`.
- Add `@saflib/workflows` to `@saflib/workflows-cli`'s list of workflows.
- Check that the new workflow appears in the saf-workflow CLI tool.
- Stop and understand the workflow requirements before proceeding.
- Create template files for example-workflow workflow.
- Implement the workflow logic in workflows/example-workflow.ts.
- Review the checklist and verify that the workflow was added correctly.

## Help Docs

```bash
Usage: saf-workflow kickoff add-workflow [options] <name>

Create a new workflow and adds it to the CLI tool. Stops after setup to wait for
implementation requirements.

Arguments:
  name        The name of the new workflow to create (e.g.,
              'refactor-component')

Options:
  -h, --help  display help for command

```
