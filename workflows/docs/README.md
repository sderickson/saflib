# Overview

`@saflib/workflows` is a library that provides the means to create and run workflows. Other libraries depend on this one to make their own workflows. Then `@saflib/workflows-cli` depends on all those packages to make their workflows available on the command line.

For more information on what workflows are, and what they're for, see [the top-level doc](../../workflows.md).

## Status

Workflows are an experimental tool; I'm actively iterating on the interface, features, behavior, and underlying implementation. The [package interface](./ref/index.md) is janky and exposes a great deal of XState underneath. Use at your own risk!
