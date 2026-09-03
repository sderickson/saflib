# Overview

`@saflib/commander` helps add CLI commands to your package's `bin` field. It uses [commander](https://github.com/tj/commander.js#readme) under the hood.

## Package scripts and bin

SAF packages expose CLI commands through npm `bin` entries. Consuming packages should add `scripts` entries for those commands and arguments they use most frequently. That makes sure a package makes clear what tooling it depends on and how it's mainly expected to be used.
