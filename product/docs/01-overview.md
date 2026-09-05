# Overview

`@saflib/product` provides workflows for **creating a new SAF product** from the golden template in [`@saflib/base`](../../base/docs/01-overview.md). It is not product runtime code — only scaffolding and setup automation registered with [`saf-workflow`](../../workflows-cli/docs/cli/saf-workflow.md).

## New monorepo: `saf-create`

For a **new git repository** with no saflib submodule yet (Node.js 26+):

```bash
curl -fsSL https://raw.githubusercontent.com/sderickson/saflib/main/product/create/saf-create.sh -o /tmp/saf-create.sh
chmod +x /tmp/saf-create.sh
/tmp/saf-create.sh <name> <domain> --saflib-ref main
```

See [create workflow docs](./workflows/create.md).

## Creating a product: `product/init`

From the monorepo root (alongside `saflib/`):

```bash
npm exec saf-workflow kickoff product/init <name> <domain> [--productOnly]
```

This copies `base` into `{name}/`, rewrites package names and paths, adds the product to root workspaces, runs install, and bootstraps env, tsconfig, and database migrations. See [init workflow docs](./workflows/init.md) for the full checklist.

After init, extend the product with platform workflows (OpenAPI, Drizzle, Express, SDK, Vue) — most of those target files under `base` as the reference shape. Use [`processes/spec-project`](../../processes/docs/01-overview.md) when you want a spec → plan → phased implementation flow for a larger feature.
