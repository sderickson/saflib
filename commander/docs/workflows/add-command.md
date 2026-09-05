# commander/add-command

## Source

[add-command.ts](https://github.com/sderickson/saflib/blob/main/commander/workflows/add-command.ts)

## Usage

```bash
npm exec saf-workflow kickoff commander/add-command <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Upsert 2 templates.
- Update **example-command.ts**
- Test the command was added correctly by running:
- Run `npm install @saflib/docs --save-dev`
- Run `npm exec saf-docs generate`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff commander/add-command <path>

Create a new CLI command and add it to an existing Commander.js CLI

Arguments:
  path        Relative path to the new command file, e.g. bin/cli-name/command-name.ts
              Example: "./bin/example-cli/example-command.ts"

```
