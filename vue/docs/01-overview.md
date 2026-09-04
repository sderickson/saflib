# Overview

`@saflib/vue` provides conventions, components, and workflows for **Vue SPAs** in SAF products — page structure, reverse-t i18n, TanStack Query integration, product events, and Vitest/Playwright-friendly testing.

Each SPA is one npm package under `{product}/clients/{subdomain}/`, named after a **subdomain** (`app`, `auth`, `admin`, …). Subpath-hosted SPAs on another subdomain are not supported. Apex/root clients use a name like `root` that will not collide with real subdomains.

Use the workflow [vue/add-spa](./workflows/add-spa.md) to create a new SPA or [vue/add-static-site](./workflows/add-static-site.md) to create a static subdomain with Vitepress, then [vue/add-view](./workflows/add-view.md) to add pages to your SPA and [vue/add-e2e-test](./workflows/add-e2e-test.md) to add Playwright tests.

| Workflow                                              | Use                                    |
| ----------------------------------------------------- | -------------------------------------- |
| [vue/add-spa](./workflows/add-spa.md)                 | New subdomain SPA + build shim + Caddy |
| [vue/add-view](./workflows/add-view.md)               | New page under an existing SPA         |
| [vue/add-e2e-test](./workflows/add-e[./2e-test.md)       | Playwright spec stub                   |
| [vue/add-static-site](./workflows/add-static-site.md) | Non-Vue static client                  |


## What this package provides

| Export                                                                                                                                                      | Role                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [`createSpaMain`](./ref/@saflib/vue/functions/createSpaMain.md)                                                                                             | Standard SPA `main()` — client name, document title, router, i18n, optional Sentry callback |
| [`createVueApp`](./ref/@saflib/vue/functions/createVueApp.md)                                                                                               | Lower-level app bootstrap (Vuetify, Vue Router, TanStack Query, vue-i18n)                   |
| [`useReverseT` / `makeReverseTComposable`](./ref/@saflib/vue/functions/makeReverseTComposable.md)                                                           | Value-based i18n lookups — see [i18n](./03-i18n.md)                                         |
| [`AsyncPage`](./ref/components/AsyncPage.md), [`useAsyncPageDocumentTitle`](./ref/@saflib/vue/functions/useAsyncPageDocumentTitle.md)                       | Code-split pages with loader gating — see [Components](./02-components.md)                  |
| [`commonEventLogger`](./ref/@saflib/vue/functions/commonEventLogger.md) / [`makeProductEventLogger`](./ref/@saflib/vue/functions/makeProductEventLogger.md) | Browser product events → PostHog / dev buffer                                               |
| [`./components`](./ref/components/index.md)                                                                                                                 | Shared UI (`AsyncPage`, `SpaLink`, `SnackbarQueue`, …)                                      |
| [`./testing`](./ref/@saflib/vue/testing/index.md)                                                                                                           | `mountWithPlugins`, `stubGlobals`, `getElementByString`                                     |
| `./vitest-config`                                                                                                                                           | Shared Vitest presets — [Coverage enforcement](./04-testing.md#coverage-enforcement)        |
| [`./workflows`](./workflows/index.md)                                                                                                                       | Scaffold SPAs, views, e2e specs, static sites                                               |

## SPA package structure

Golden reference: [`base/clients/app/`](../../base/clients/app/).
