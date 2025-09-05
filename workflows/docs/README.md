# Overview

`@saflib/workflows` provides a framework for defining and running developer workflows in TypeScript projects, particularly with coding tools such as Cursor, Claude Code, or any tool which integrates an LLM with coding tools, and which may run arbitrary commands continuously if allowed.

The purpose of `@saflib/workflows` is to make code generation more reliable for routine work. You can define a series of steps which the agent will follow, with checks along the way to make sure the work is done according to what is correct for your project or stack.

For more information on the why, see [the top-level doc](../../workflows.md).

`@saflib/workflows` is a library that provides the means to create and run workflows. Other libraries depend on this one to make their own workflows. Then `@saflib/workflows-cli` depends on all those packages to make their workflows available on the command line.

For more information on what workflows are, and what they're for, see [the top-level doc](../../workflows.md).

## Status

Workflows are an experimental tool; I'm actively iterating on the interface, features, behavior, and underlying implementation. The [package interface](./ref/index.md) is janky and exposes a great deal of XState underneath. Use at your own risk!
