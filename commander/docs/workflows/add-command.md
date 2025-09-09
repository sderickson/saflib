# commander/add-command

## Source

[add-command.ts](add-command.ts)

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

- Copy template files and rename placeholders.
  - Upsert **example-command.ts** from [template](template-file.ts)
- Update **example-command.ts**, resolving any TODOs.
- Add the new command to the adjacent index.ts file.
- Test the new command.
- Implement the new command.
- Run `npm install @saflib/dev-tools --save-dev`
- Run `npm exec saf-docs generate`

## Help Docs

```bash
Usage: saf-workflow kickoff commander/add-command [options] <path>

Create a new CLI command and add it to an existing Commander.js CLI

Arguments:
  path        Relative path to the new command file, e.g.
              bin/cli-name/command-name.ts

Options:
  -h, --help  display help for command

```
