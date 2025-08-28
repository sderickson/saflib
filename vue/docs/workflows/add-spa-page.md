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
  - Upsert **ExamplePage.strings.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/page-template/TemplateFile.strings.ts)
  - Upsert **ExamplePage.test.ts** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/page-template/TemplateFile.test.ts)
  - Upsert **ExamplePage.vue** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/page-template/TemplateFile.vue)
  - Upsert **ExamplePageAsync.vue** from [template](https://github.com/sderickson/saflib/blob/main/vue/workflows/page-template/TemplateFileAsync.vue)
- Update ExamplePage.loader.ts to remove TODOs
- Update ExamplePage.vue to remove TODOs
- Find the "links" package adjacent to this package. Add the link for the new page there along with the others.
- Update router.ts to remove TODOs
- Update ExamplePage.test.ts to remove TODOs
- Run test, make sure it passes.
- Update ExamplePage.strings.ts to remove TODOs
- Find the strings.ts file in the root of the package. Add the strings from the file you just updated there.
- Update ExamplePage.vue to remove TODOs
- Update ExamplePage.test.ts to remove TODOs
- Run test, make sure it passes.
- Have the human run the website and confirm that the page looks and works as expected.

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
