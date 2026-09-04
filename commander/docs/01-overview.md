# Overview

`@saflib/commander` helps add CLI commands to your package's `bin` field. It uses [the open-source commander package](https://github.com/tj/commander.js#readme) under the hood, and provides a lightweight `setupContext` for CLI logging — without depending on `@saflib/node`.

Use [add-cli](./workflows/add-cli.md) to add a commander program to your package bin, and [add-command](./workflows/add-command.md) to add a command to an existing program.

## Package scripts and bin

SAF packages expose CLI commands through npm `bin` entries. Consuming packages should add `scripts` entries for those commands and arguments they use most frequently. That makes sure a package makes clear what tooling it depends on and how it's mainly expected to be used.
