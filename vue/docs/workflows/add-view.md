# vue/add-view

## Source

[add-view.ts](https://github.com/sderickson/saflib/blob/main/vue/workflows/add-view.ts)

## Usage

```bash
npm exec saf-workflow kickoff vue/add-view <path> <urlPath>
```

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

Kicking off workflow vue/add-view

- Upsert 7 templates.
- Update **WelcomeNewUser.vue** to render the page:
- Now that the view is implemented, extract sub-components, testable logic, and composables, and write tests.
- ## Import graph / SPA bundles
- Run `npm run test`
- Run `npm run typecheck`

## Help Docs

```bash
Usage: npm exec saf-workflow kickoff vue/add-view <path> <urlPath>

Create a new page, dialog, or other view in a SAF-powered Vue SPA, using a
   template and renaming placeholders.

Arguments:
  path        Folder path of the new page or dialog (e.g., './pages/welcome-new-user')
              Example: "./pages/welcome-new-user"
  urlPath     The URL path for the view (e.g., '/recipes/:id' or '/recipes/create')
              Example: "/welcome-new-user"

```
