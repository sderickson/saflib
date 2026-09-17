# Overview

`@saflib/product` provides scaffolding and setup automation for **creating a new SAF product** from the golden template in [`@saflib/base`](../../base/docs/01-overview.md). It is not product runtime code — only tooling registered with [`saf-workflow`](../../workflows-cli/docs/cli/saf-workflow.md) plus the `saf-create` bootstrap CLI.

## New monorepo

To bootstrap a new git repository (add saflib, run `product/init`), follow **[Getting Started](../../getting-started.md)**. CLI details: [`saf-create`](./cli/saf-create.md).

## Creating a product: `product/init`

From a monorepo root that already has `saflib/` (alongside the product tree):

```bash
npm exec saf-workflow kickoff product/init <name> <domain> [--productOnly]
```

This copies `base` into `{name}/` (skipping suite docs under `base/docs/`), rewrites package names and paths, adds the product to root workspaces, runs install, and bootstraps env, tsconfig, and database migrations. See [init workflow docs](./workflows/init.md) for the full checklist.

To exercise bootstrap and init against a local saflib checkout (without GitHub), see [local init testing](./02-local-init-testing.md).

After init, extend the product with platform workflows (OpenAPI, Drizzle, Express, SDK, Vue) — most of those target files under `base` as the reference shape. Use [`processes/spec-project`](../../processes/docs/01-overview.md) when you want a spec → plan → phased implementation flow for a larger feature.
