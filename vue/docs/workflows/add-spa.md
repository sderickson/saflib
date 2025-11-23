# vue/add-spa

## Source

[add-spa.ts](https://github.com/sderickson/saflib/blob/main/vue/workflows/add-spa.ts)

## Usage

```bash
npm exec saf-workflow kickoff vue/add-spa <productName> <subdomainName>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **AdminApp.vue** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-__subdomain-name__-spa/__SubdomainName__App.vue)
  - Upsert **i18n.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-__subdomain-name__-spa/i18n.ts)
  - Upsert **main.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-__subdomain-name__-spa/main.ts)
  - Upsert **package.json** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-__subdomain-name__-spa/package.json)
  - Upsert **router.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-__subdomain-name__-spa/router.ts)
  - Upsert **strings.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-__subdomain-name__-spa/strings.ts)
  - Upsert **test-app.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-__subdomain-name__-spa/test-app.ts)
  - Upsert **tsconfig.json** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-__subdomain-name__-spa/tsconfig.json)
  - Upsert **vitest.config.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-__subdomain-name__-spa/vitest.config.ts)
  - Upsert **HomePage.loader.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-__subdomain-name__-spa/pages/home-page/HomePage.loader.ts)
  - Upsert **HomePage.strings.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-__subdomain-name__-spa/pages/home-page/HomePage.strings.ts)
  - Upsert **HomePage.test.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-__subdomain-name__-spa/pages/home-page/HomePage.test.ts)
  - Upsert **HomePage.vue** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-__subdomain-name__-spa/pages/home-page/HomePage.vue)
  - Upsert **HomePageAsync.vue** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-__subdomain-name__-spa/pages/home-page/HomePageAsync.vue)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-__subdomain-name__-links/index.ts)
  - Upsert **package.json** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-__subdomain-name__-links/package.json)
  - Upsert **package.json** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients/package.json)
  - Upsert **.gitignore** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients/.gitignore)
  - Upsert **Dockerfile** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients/Dockerfile)
  - Upsert **Dockerfile.template** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients/Dockerfile.template)
  - Upsert **env.schema.combined.json** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients/env.schema.combined.json)
  - Upsert **html-header-plugin.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients/html-header-plugin.ts)
  - Upsert **index.html** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients/index.html)
  - Upsert **overrides.scss** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients/overrides.scss)
  - Upsert **package.json** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients/package.json)
  - Upsert **tsconfig.app.json** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients/tsconfig.app.json)
  - Upsert **tsconfig.json** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients/tsconfig.json)
  - Upsert **tsconfig.node.json** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients/tsconfig.node.json)
  - Upsert **vite.config.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients/vite.config.ts)
  - Upsert **index.html** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients/__subdomain-name__/index.html)
  - Upsert **main.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients/__subdomain-name__/main.ts)
  - Upsert **favicon.png** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients/public/favicon.png)
  - Upsert **privacy.md** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients/public/privacy.md)
  - Upsert **terms.md** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients/public/terms.md)
  - Upsert **exports.test.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients-common/exports.test.ts)
  - Upsert **i18n.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients-common/i18n.ts)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients-common/index.ts)
  - Upsert **package.json** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients-common/package.json)
  - Upsert **playwright.config.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients-common/playwright.config.ts)
  - Upsert **strings.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients-common/strings.ts)
  - Upsert **tsconfig.json** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients-common/tsconfig.json)
  - Upsert **vitest.config.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients-common/vitest.config.ts)
  - Upsert **vuetify-config.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients-common/vuetify-config.ts)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients-common/assets/index.ts)
  - Upsert **events.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients-common/clients/events.ts)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients-common/clients/index.ts)
  - Upsert **posthog.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients-common/clients/posthog.ts)
  - Upsert **sentry.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients-common/clients/sentry.ts)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients-common/components/index.ts)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients-common/composables/index.ts)
  - Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients-common/utils/index.ts)
  - Upsert **ProductNameLayout.strings.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients-common/components/__product-name__-layout/__ProductName__Layout.strings.ts)
  - Upsert **ProductNameLayout.vue** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-clients-common/components/__product-name__-layout/__ProductName__Layout.vue)
- Change working directory to clients/product-name/product-name-admin-spa
- Run `npm install`
- Change working directory to clients/product-name/product-name-clients
- Run `npm install @saflib/product-name-admin-spa`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff vue/add-spa <productName> <subdomainName>

Create a new SAF-powered frontend SPA using Vue, Vue-Router, and Tanstack Query

Arguments:
  productName Name of the new or existing product (e.g. 'product-name')
              Example: "product-name"
  subdomainNameName of the new subdomain (e.g. 'admin')
              Example: "admin"

```
