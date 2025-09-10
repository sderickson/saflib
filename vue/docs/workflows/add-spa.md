# vue/add-spa

## Source

[add-spa.ts](https://github.com/sderickson/saflib/blob/main/vue/workflows/add-spa.ts)

## Usage

```bash
npm exec saf-workflow kickoff vue/add-spa <name>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **ExampleSpaApp.vue** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/spa-template/TemplateFileApp.vue)
  - Upsert **i18n.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/spa-template/i18n.ts)
  - Upsert **main.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/spa-template/main.ts)
  - Upsert **package.json** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/spa-template/package.json)
  - Upsert **pages** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/spa-template/pages)
  - Upsert **router.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/spa-template/router.ts)
  - Upsert **strings.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/spa-template/strings.ts)
  - Upsert **test-app.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/spa-template/test-app.ts)
  - Upsert **tsconfig.json** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/spa-template/tsconfig.json)
  - Upsert **vitest.config.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/spa-template/vitest.config.ts)
- Add `@saflib/web-example-spa` as a dependency in `clients/spas/package.json`, then run `npm install` from the root of the monorepo (not from the `clients/spas` directory).
- Create `index.html` and `main.ts` files in `clients/spas/example-spa` similar to other SPAs already there.
- Update `clients/spas/vite.config.ts` to add proxy and input properties for the new SPA.
- Update all `Caddyfiles` in the repo; add the new SPA in a similar fashion with the subdomain `example-spa`.
- Test the new SPA by running 'npm run build' from `deploy/prod` and make sure there are no errors.

## Help Docs

```bash
Usage: saf-workflow kickoff vue/add-spa [options] <name>

Create a new SAF-powered frontend SPA using Vue, Vue-Router, and Tanstack Query

Arguments:
  name        Name of the new SPA (e.g. 'admin' for web-admin)

Options:
  -h, --help  display help for command

```
