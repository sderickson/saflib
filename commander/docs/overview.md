# Overview

`@saflib/commander` is a library for adding CLI commands to your package's `bin` field. It uses [commander](https://github.com/tj/commander.js#readme) under the hood.

Currently it's pretty lightweight, just providing a convenience function for providing `@saflib/node` context and reporters to your CLI commands.

See the [`saf-workflow`](https://github.com/sderickson/saflib/blob/main/workflows/src/saf-workflow-cli/index.ts) CLI implementation for an example of how to set up a command in a SAF package.

For how product packages should **call** platform bins from `package.json` scripts (and when to add new ones), see [Package scripts and platform bins](./package-scripts-and-bins.md).

## Workflows

- [`commander/add-cli`](./workflows/add-cli.md) — scaffold a new bin CLI
- [`commander/add-command`](./workflows/add-command.md) — add a subcommand to an existing CLI
