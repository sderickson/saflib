# Overview

The `@saflib/vue` package provides a comprehensive set of tools and workflows for creating Single Page Applications (SPAs) within SAF clients. It includes:

- Opinionated file and page structure
- Product event logging
- i18n (vue-i18n)
- Tanstack Query
- Testing utilities such as MSW

Each SPA built with `@saflib/vue` should be dedicated to, and named after, a single subdomain on a website, such as example.com, auth.example.com, or app.example.com. SPAs hosted as subpaths within another subdomain are not supported. SPAs for the domain root can be called something like "root" or "landing" or some other term that's unlikely to be used as a subdomain.

## Package Structure

Each package which depends on `@saflib/vue` should have the following structure:

```
web-{subdomain}/
├── e2e/
│   ├── {user-flow-1}/
│   │   └── user-flow-1.spec.ts
│   ├── {user-flow-2}/
│   │   └── user-flow-2.spec.ts
│   └── ...
├── pages/
│   ├── {page-one}/
│   │   ├── components/
│   │   ├── PageOne.loader.ts
│   │   ├── PageOne.strings
│   │   ├── PageOne.test.ts
│   │   ├── PageOne.vue
│   │   └── PageOneAsync.vue
│   ├── {page-two}/
│   │   └── ...
│   └── ...
├── {Subdomain}App.vue
├── i18n.ts
├── main.ts
├── package.json
├── router.ts
├── strings.ts
├── test-app.ts
├── tsconfig.json
└── vitest.config.ts
```

## Files and Directories Explained

### `e2e/`

Contains Playwright tests for this SPA. These tests are likely to test pages outside of the SPA as well (such as for logging in through an auth client, or creating a test user through an admin client). This is fine and expected; this helps ensure dependencies between clients are tested. But the tests inside a package should mainly be focused on the experiences of the package itself.

E2E tests are organized by directory because each of them is likely to produce artifacts, such as screenshots.

For more information, see [`@saflib/playwright`](../../playwright/docs/overview.md)

### `pages/`

Contains the components for each page of the SPA. Each page is expected to have:

1. The main component which handles what is displayed
2. An "async" component which uses `AsyncPage` to render a loading screen while data is fetched and code is loaded.
3. A "loader" which is used by both the main and async components to run Tanstack Queries.
4. A "strings" file which contains the default language strings for the page.
5. A test file which mainly checks the component correctly renders on page load.
6. (optional) a "components" directory for sub-components specific to this page (shared components should go in a "common" package).

For more information, see [Pages](./02-pages.md).

### `{Subdomain}App.vue`

_[Template file](../workflows/spa-template/TemplateFileApp.vue)_

The root Vue component for the SPA. At minimum, it should include a `<router-view />` element. This is also where your SPA's layout should go; if different pages have different layouts, they should probably be different SPAs!

### `i18n.ts`

_[Template file](../workflows/spa-template/i18n.ts)_

Each page and component in this package should call `const { t } = useReverseT()` and use the `t` function to translate strings. Note that this is separate from `strings.ts` to avoid external packages that depend on `strings.ts` also depending on Vue I18n and co.

For more information, see [i18n](./03-i18n.md).

### `main.ts`

_[Template file](../workflows/spa-template/main.ts)_

Exports a `main` function which:

1. Calls [`setClientName`](./ref/functions/setClientName.md)
2. Calls [`createVueApp`](./ref/functions/createVueApp.md)

It will look something like [this](../workflows/spa-template/main.ts).

This function is exported by the package as the main entrypoint and used by a "spas" package to build all SPAs together.

### `router.ts`

_[Template file](../workflows/spa-template/router.ts)_

Defines routes, then creates a [Vue Router](https://router.vuejs.org/) instance and exports it to be used in `main.ts`.

### `strings.ts`

_[Template file](../workflows/spa-template/strings.ts)_

Imports and re-exports all `strings` files in the package. This is both used by `main.ts` for [Vue I18n](https://vue-i18n.intlify.dev/), and exported by the package at the `"./strings"` entrypoint for use by other packages. Strings are kept separate from the rest of the package so they don't inadvertently depend on Vue and the necessary build systems. Then runners like Playwright don't need to support all that.

### `test-app.ts`

_[Template file](../workflows/spa-template/test-app.ts)_

Exports a `mountTestApp` function which wraps and extends Vue Test Utils' [`mount`](https://test-utils.vuejs.org/api/#mount) function. This function can let [`mountWithPlugins`](./ref/@saflib/vue/testing/functions/mountWithPlugins.md) do most of the heavy lifting.

### `tsconfig.json` and `vitest.config.ts`

- _[tsconfig.json template file](../workflows/spa-template/tsconfig.json)_
- _[vitest.config.ts template file](../workflows/spa-template/vitest.config.ts)_

These use ones provided by `@saflib/vue` due to needs peculiar to Vue.
