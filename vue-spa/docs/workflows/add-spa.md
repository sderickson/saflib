# add-spa

## Source

[add-spa.ts](https://github.com/sderickson/saflib/blob/main/vue-spa/workflows/add-spa.ts)

## Usage

```bash
npm exec saf-workflow kickoff add-spa <name>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

* Copy template files and rename placeholders.
  * Upsert **TemplateApp.vue** from [template](https://github.com/sderickson/saflib/blob/main/vue-spa/workflows/spa-template/TemplateApp.vue)
  * Upsert **index.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue-spa/workflows/spa-template/index.ts)
  * Upsert **main.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue-spa/workflows/spa-template/main.ts)
  * Upsert **node_modules** from [template](https://github.com/sderickson/saflib/blob/main/vue-spa/workflows/spa-template/node_modules)
  * Upsert **package.json** from [template](https://github.com/sderickson/saflib/blob/main/vue-spa/workflows/spa-template/package.json)
  * Upsert **pages** from [template](https://github.com/sderickson/saflib/blob/main/vue-spa/workflows/spa-template/pages)
  * Upsert **router.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue-spa/workflows/spa-template/router.ts)
  * Upsert **strings.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue-spa/workflows/spa-template/strings.ts)
  * Upsert **tsconfig.json** from [template](https://github.com/sderickson/saflib/blob/main/vue-spa/workflows/spa-template/tsconfig.json)
  * Upsert **vitest.config.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue-spa/workflows/spa-template/vitest.config.ts)
* Update the package name and other template strings in the new SPA's package.json and other files. The new package name is @saflib/web-example-spa-client. Also update the "router.ts" file to use the new SPA's name as the base path.
* Add @saflib/web-example-spa-client as a dependency in clients/spas/package.json, then run 'npm install' from the root of the monorepo (not from the clients/spas directory).
* Create index.html and main.ts files in clients/spas/example-spa similar to other SPAs already there.
* Update clients/spas/vite.config.ts to add proxy and input properties for the new SPA.
* Update deploy/prod/remote-assets/config/Caddyfile to add the new SPA to the serve_prod_spas snippet.
* Test the new SPA by running 'npm run build' and make sure there are no errors, then ask the user to run 'npm run prod-local' in the instance directory and have them verify the new page shows up.


## Help Docs

```bash
Usage: saf-workflow kickoff add-spa [options] <name>

Create a new SAF-powered frontend SPA using Vue, Vue-Router, and Tanstack Query

Arguments:
  name        Name of the new SPA (e.g. 'admin' for web-admin)

Options:
  -h, --help  display help for command

```
