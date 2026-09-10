# Overview

`@saflib/playwright` provides shared [Playwright](https://playwright.dev/) utilities for SAF products: typed string locators aligned with Vue copy, screenshot helpers for journey review, Vuetify conveniences, and a default config SPA packages extend.

E2E specs live in each client SPA under `e2e/` (see [@saflib/vue — `e2e/`](../../vue/docs/01-overview.md#e2e)). Product layout and client packages are described in [base](../../base/docs/01-overview.md).

## Writing tests

Tests are often authored manually or with agent help. A typical flow:

1. Run the app against a **production-like** build (the `prod-local` script in the `deploy/` folder). Production bundles behave more consistently under Playwright.
2. Use Playwright [codegen](https://playwright.dev/docs/codegen) for a first pass.
3. Refactor to **fixtures** and [`getByString`](#string-locators) using page `.strings.ts` exports. After [vue/add-view](../../vue/docs/workflows/add-view.md), each page has a fixture stub to extend. This step is particularly good for an agent to do.

You can also use the [vue/add-e2e-test](../../vue/docs/workflows/add-e2e-test.md) workflow to create Playwright tests, though it's a good idea to have created the codegen tests to include in the prompts.

## What this package provides

| Export                                                                                                                | Role                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [`getByString`](./ref/functions/getByString.md)                                                                       | Locate elements from the same `ElementString` objects Vue binds (see [String locators](#string-locators))    |
| [`attachScreenshot`](./ref/functions/attachScreenshot.md) / [`cleanScreenshots`](./ref/functions/cleanScreenshots.md) | Visual record of a user journey in the HTML report; Chromium copies land beside the spec for deploy bundling |
| [`chooseVuetifySelectOption`](./ref/functions/chooseVuetifySelectOption.md)                                           | Open a Vuetify combobox and pick an option (handles async items and truncated labels)                        |
| [`getUniqueEmail`](./ref/functions/getUniqueEmail.md) / [`getUniqueId`](./ref/functions/getUniqueId.md)               | Ephemeral test identities                                                                                    |
| [`tightAndroidViewport`](./ref/variables/tightAndroidViewport.md)                                                     | Small mobile viewport for responsive checks                                                                  |
| [`playwright.config`](https://github.com/sderickson/saflib/blob/main/playwright/playwright.config.ts)                 | Default SAF config (browsers, health gate, timeouts)                                                         |

Entrypoint: `@saflib/playwright` and `@saflib/playwright/playwright.config`.

## Integration

**SPA packages** — each `{product}/clients/{spa}/` holds `e2e/**/*.spec.ts` and a `playwright.config.ts` that re-exports the shared default (see [`base/clients/common/playwright.config.ts`](https://github.com/sderickson/saflib/blob/main/base/clients/common/playwright.config.ts)). Set `DOMAIN` and `PROTOCOL` for the stack under test (local dev uses `docker.localhost` / `http`).

**Fixtures** — page-level Playwright fixtures (`PageName.fixture.ts`) are scaffolded by [vue/add-view](../../vue/docs/workflows/add-view.md). Cross-SPA flows compose fixtures from `@saflib/ory-kratos-spa/fixtures`, product `common/fixtures`, and page fixtures (example: [`base/clients/admin/e2e`](https://github.com/sderickson/saflib/blob/main/base/clients/admin/e2e/admin-navigation.spec.ts)).

**Security e2e** — HTTP/browser security specs in `@saflib/base-security` use `createSecurityPlaywrightConfig` from `@saflib/security/playwright/config` (see [@saflib/security](../../security/docs/01-overview.md)), not this package's SPA default.

## String locators {#string-locators}

Playwright's built-in locators are flexible, but copy-heavy UIs break tests when strings drift. SAF shares the same string objects between Vue templates and Playwright via [`ElementString`](../../utils/docs/ref/index/type-aliases/ElementString.md) / [`ElementStringObject`](../../utils/docs/ref/index/interfaces/ElementStringObject.md) from `@saflib/utils` — see [best-practices — shared strings](../../best-practices.md#specify-and-enforce-shared-apis-models-and-strings).

Each page exports a `.strings.ts` file; the SPA re-exports them at `./strings` so Playwright imports strings **without** pulling in Vite or Vue (see [vue — `strings.ts`](../../vue/docs/01-overview.md#stringsts)).

String objects use keys that map to HTML attributes (`text`, `aria-label`, `data-testid`, `placeholder`, `label`, …). Bind in Vue:

```html
<button v-bind="elementStringObject" />
```

`getByString` picks the best matching Playwright locator for whichever keys are present (label → test id → placeholder → text). For i18n interpolation patterns in plain strings, it uses the same regex helper as `@saflib/utils`.

Define and organize strings in [@saflib/vue — Components](../../vue/docs/02-components.md) and [i18n](../../vue/docs/03-i18n.md).

## User journeys

Tests should cover the **designed user journeys** for the SPA they primarily exercise. Specs may cross subdomains (auth login, admin setup) when those dependencies are part of the journey — that is expected.

Organize specs under `e2e/{journey}/` so screenshot artifacts stay grouped per flow.

Use [`attachScreenshot`](./ref/functions/attachScreenshot.md) at key steps to document the journey in the HTML report. Call [`cleanScreenshots`](./ref/functions/cleanScreenshots.md) at the start of a spec so Chromium PNGs beside the test file reflect the latest run (gitignored; optional deploy bundling).

## Default Playwright config

[`@saflib/playwright/playwright.config`](../../playwright/playwright.config.ts) provides:

- **Projects** — Chromium and Firefox, both depending on a **server health** setup project
- **Global health gate** — [`global.setup.ts`](../../playwright/global.setup.ts) polls `{PROTOCOL}://api.{DOMAIN}/health` until all configured API subdomains return 200 (matches product Caddy `api.{DOMAIN}`)
- **Timeouts** — 10s action and expect timeouts (Playwright defaults are 30s)
- **CI** — `forbidOnly`, two retries, single worker; local runs use parallel workers
- **Tracing** — `on-first-retry`; HTML reporter

Extend or replace in a SPA's `playwright.config.ts` when a product needs extra projects (mobile viewport, webkit, etc.).
