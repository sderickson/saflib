# vue/add-page

## Source

[add-page.ts](https://github.com/sderickson/saflib/blob/main/vue/workflows/add-page.ts)

## Usage

```bash
npm exec saf-workflow kickoff vue/add-page <path>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **WelcomeNewUser.loader.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-__subdomain-name__-spa/pages/page-template/__TargetName__.loader.ts)
  - Upsert **WelcomeNewUser.vue** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-__subdomain-name__-spa/pages/page-template/__TargetName__.vue)
  - Upsert **WelcomeNewUserAsync.vue** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-__subdomain-name__-spa/pages/page-template/__TargetName__Async.vue)
  - Upsert **WelcomeNewUser.strings.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/template/__product-name__-__subdomain-name__-spa/pages/page-template/__TargetName__.strings.ts) (includes `documentTitle` for the browser tab)
- Update **WelcomeNewUser.loader.ts**: return Tanstack queries needed to render the page.
- Update **WelcomeNewUser.vue**: take the data from the loader, assert that it's loaded, and render sample data.
- Find the "links" package adjacent to this package. Add the link for the new page there along with the others.
- Update the new page to **router.ts**.
- Extract testable logic to **WelcomeNewUser.logic.test.ts** and composables to **useWelcomeNewUserFlow.test.ts** as needed (no render-only smoke test).
- Run `npm run test`
- Update **WelcomeNewUser.strings.ts**: include all text from the design.
- Add those strings to the **strings.ts** file in the root of the package.
- Update **WelcomeNewUser.vue** to match the design and use the translation system.
- Run `npm run typecheck`
- Run `npm run test`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff vue/add-page <path>

Create a new page in a SAF-powered Vue SPA, using a template and renaming
   placeholders.

Arguments:
  path        Path of the new page (e.g., './pages/welcome-new-user')
              Example: "./pages/welcome-new-user"

```
