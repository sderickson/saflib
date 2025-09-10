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
  - Upsert **example-workflow.ts** from [template](https://github.com/sderickson/saflib/blob/main/workflows/workflows/add-workflow.templates/template-file.ts)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/workflows/workflows/add-workflow.templates/index.ts)
- Add name, description, and cliArguments to the newly created workflows/example-workflow.ts.
- Export **example-workflow** from **@example/package**.
- Find the file which gathers all workflows to include them in the saf-workflow CLI tool.
- If needed, install `@example/package` as a dependency of the package that contains that file you found.
- Add `@example/package`'s exported workflows to the CLI file's list of workflows.
- Check that the new workflow appears in the saf-workflow CLI tool.
- Review documentation: [README.md](https://github.com/sderickson/saflib/blob/main/workflows/docs/README.md)
- Create template files for example-workflow workflow.
- Add documentation links to the workflow.
- Add steps to workflows/example-workflow.ts.
- Review the checklist and verify that the workflow was added correctly.

## Help Docs

```bash
Usage: saf-workflow kickoff workflows/add-workflow [options] <name>

Create a new workflow and adds it to the CLI tool. Stops after setup to wait for
implementation requirements.

Arguments:
  name        The name of the new workflow to create (e.g.,
              'refactor-component')

Options:
  -h, --help  display help for command

```
