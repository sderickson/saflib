# add-spa-page

## Source

[add-spa-page.ts](https://github.com/sderickson/saflib/blob/main/vue/workflows/add-spa-page.ts)

## Usage

```bash
npm exec saf-workflow kickoff add-spa-page <name>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

- Copy template files and rename placeholders.
  - Upsert **ExamplePage.loader.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/page-template/TemplateFile.loader.ts)
  - Upsert **ExamplePage.vue** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/page-template/TemplateFile.vue)
  - Upsert **ExamplePageAsync.vue** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/page-template/TemplateFileAsync.vue)
  - Upsert **ExamplePage.strings.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/page-template/TemplateFile.strings.ts)
  - Upsert **ExamplePage.test.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/page-template/TemplateFile.test.ts)
- Update **ExamplePage.loader.ts**: return Tanstack queries needed to render the page.
- Update **ExamplePage.vue**: take the data from the loader, assert that it's loaded, and render sample data.
- Find the "links" package adjacent to this package. Add the link for the new page there along with the others.
- Update the new page to **router.ts**.
- Update **ExamplePage.test.ts**: test that the page renders.
- Run **ExamplePage.test.ts**, make sure it passes.
- Update **ExamplePage.strings.ts**: include all text from the design.
- Add those strings to the **strings.ts** file in the root of the package.
- Update **ExamplePage.vue** to match the design and use the translation system.
- Update **ExamplePage.test.ts** to verify that the page renders correctly with the new design and translation system.
- Run **ExamplePage.test.ts**, make sure it passes.
- Run tests in the package, make sure they all pass.

## Help Docs

```bash
Usage: saf-workflow kickoff add-spa-page [options] <name>

Create a new page in a SAF-powered Vue SPA, using a template and renaming
placeholders.

Arguments:
  name        Name of the new page in kebab-case (e.g. 'welcome-new-user')

Options:
  -h, --help  display help for command

```
