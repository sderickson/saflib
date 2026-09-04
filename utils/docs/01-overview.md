# Overview

This is a package to place shared logic which doesn't depend on anything else, like string utilities. Think things like [lodash](https://lodash.com/) functions.

It also holds:

- [`ReturnsError`](./ref/index/type-aliases/ReturnsError.md) / [`throwError`](./ref/index/functions/throwError.md) — typed async error returns for queries, integrations, and similar package functions
- Code shared between `@saflib/vue` and `@saflib/playwright` for working with translation strings
