# Overview

`@saflib/vite` provides shared [Vite](https://vite.dev/) configuration for SAF **multi-SPA client build** packages — one Vite app that builds every subdomain SPA in a product's `clients/` tree.

Golden reference: [`base/clients/build/vite.config.ts`](https://github.com/sderickson/saflib/blob/main/base/clients/build/vite.config.ts) (`@saflib/base-clients`). Individual SPA packages under `clients/{subdomain}/` export `main()` entrypoints consumed by that build package; see [@saflib/vue](../../vue/docs/01-overview.md).

Code reference: [`docs/ref/`](./ref/index.md).

## What this package provides

| Export                                                                                                               | Role                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [`makeConfig`](./ref/index/functions/makeConfig.md)                                                                  | Vite config factory — Vue, Vuetify, devtools, subdomain dev routing, multi-entry build                         |
| [`workspacePackageExportsPlugin`](./ref/workspace-package-exports-plugin/functions/workspacePackageExportsPlugin.md) | Resolve workspace packages through `package.json` `exports` (including `*` patterns) without `@saflib/imports` |
| [`typedEnv`](./ref/env/variables/typedEnv.md) / [`ViteEnvSchema`](./ref/env/interfaces/ViteEnvSchema.md)             | Typed `process.env` extending [`@saflib/env`](../../env/docs/01-overview.md) core variables                    |

Entrypoints: `@saflib/vite`, `@saflib/vite/env`, `@saflib/vite/workspace-package-exports`.

## `makeConfig` behavior

Default options target a **product client build** package whose cwd contains:

- Root `index.html` (apex / empty subdomain client, when present)
- `{subdomain}/index.html` per SPA listed in `CLIENT_SUBDOMAINS`

Built-in plugins:

| Plugin                              | Purpose                                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `@vitejs/plugin-vue`                | Vue SFC support                                                                                       |
| `vite-plugin-vuetify`               | Vuetify; optional `vuetifySettings` path to `vuetify-settings.scss`                                   |
| `vite-plugin-vue-devtools`          | Dev-only Vue DevTools                                                                                 |
| **Subdomain proxy** (on by default) | Dev-server middleware: host `app.{DOMAIN}` → `/app/index.html`, etc.; `localhost` → root `index.html` |
| **Print client access URLs**        | Replaces Vite's container IP banner with Caddy-style SPA URLs (`http://app.{domain}/`, …)             |
| **`workspacePackageExportsPlugin`** | Enabled when `monorepoRoot` is passed — required so Vite resolves `@scope/*` workspace sources        |

Other defaults:

- **`appType`**: `"mpa"` (multiple HTML entrypoints from `CLIENT_SUBDOMAINS`)
- **`build.rollupOptions.input`**: root `index.html` plus each existing `{subdomain}/index.html`
- **`server.fs.allow`**: `monorepoRoot` so Docker and local dev can read `saflib/` and product packages
- **`sourcemap`**: `true` by default; set `false` for production deploys that must not serve public maps

Pass extra Vite plugins (e.g. [`htmlHeaderPlugin`](https://github.com/sderickson/saflib/blob/main/base/clients/build/vite/html-header-plugin.ts)) via `plugins`. Merge product-specific `define` blocks with `mergeConfig` as in the base build config.

## Relationship to other packages

- **`@saflib/env`** — declares and validates core env vars; client build packages use combined schemas from dependencies
- **`@saflib/vue`** — SPA structure, `main.ts` / router / i18n conventions the build package bundles
- **`@saflib/playwright`** — E2E tests set `DOMAIN` / `PROTOCOL` separately; they do not use this Vite config

Individual SPA packages use Vitest with `@saflib/vue` presets — they are **not** standalone Vite apps. Only the shared `clients/build/` package runs Vite dev/build.
