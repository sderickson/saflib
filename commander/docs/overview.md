# Overview

`@saflib/commander` is a library for adding CLI commands to your package's `bin` field. It uses [commander](https://github.com/tj/commander.js#readme) under the hood.

Currently it's pretty lightweight, just providing a convenience function for providing `@saflib/node` context and reporters to your CLI commands.

See the [`saf-workflow`](https://github.com/sderickson/saflib/blob/main/workflows/src/saf-workflow-cli/index.ts) CLI implementation for an example of how to set up a command in a SAF package.

> TODO: Add workflows
