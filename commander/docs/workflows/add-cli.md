# commander/add-cli

## Source

[add-cli.ts](add-cli.ts)

## Usage

```bash
npm exec saf-workflow kickoff commander/add-cli <name>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **index.ts** from [template](index.ts)
- Update **index.ts**, resolving any TODOs.
- Run `chmod +x bin/example-cli/index.ts`
- Add bin/example-cli/index.ts to the package's bin folder.
- Run `npm install @saflib/commander`
- Run the command `npm exec example-cli` to verify that the cli is working correctly.

## Help Docs

```bash
Usage: saf-workflow kickoff commander/add-cli [options] <name>

Create  a new CLI with Commander.js, accessible through npm exec

Arguments:
  name        The name of the cli to create (e.g., 'build' or 'deploy')

Options:
  -h, --help  display help for command

```
