# add-command

## Source

[add-command.ts](https://github.com/sderickson/saflib/blob/main/commander/workflows/add-command.ts)

## Usage

```bash
npm exec saf-workflow kickoff add-command <name>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/commander/workflows/add-command/index.ts)
- Update index.ts to remove TODOs
- Run the command `chmod +x commands/example-command/index.ts` to make the index file executable.
- Add commands/example-command/index.ts to the package's bin folder.
- Run `npm install`
- Run the command `npm exec example-command` to verify that the command is working correctly.

## Help Docs

```bash
Usage: saf-workflow kickoff add-command [options] <name>

Creates a new command for a Commander.js CLI application with proper context
setup

Arguments:
  name        The name of the command to create (e.g., 'build' or 'deploy')

Options:
  -h, --help  display help for command

```
