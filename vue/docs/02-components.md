# Components

Vue components are broken down into these classifications:

* Views
  * Pages
  * Dialogs
* Sub-Components
  * Forms
  * Displays

## Views

A view is a component which can be asynchronously loaded, and is the absolute unit of code splitting in a SAF SPA. Its code can be asynchronously loaded, and its data required for rendering fetched simultaneously while the code is loading. This helps keep the base SPA code small, and page loading and navigation snappy. All pages are views, and can render other views on-demand such as dialogs and side panels.

A sub-component is synchronously loaded and is typically provided the data it needs to render, to ensure all data needed for the initial render is part of a view loader. However, it is not wholly decoupled from networking; it should do its own on-demand fetching of data (such as for searches) or perform mutations (such as form submissions). The nice thing about Tanstack Query is it provides this flexibility and manages shared state.

Each page in a SPA has its own directory that looks like this:

```
{page-name}/
├── PageName.fixture.ts        # Playwright fixture
├── PageName.loader.ts         # Data fetching (TanStack queries)
├── PageName.strings.ts        # Localized strings for the page
├── PageName.test.ts           # Render smoke test
├── PageName.vue               # Page component (thin template)
├── PageNameAsync.vue          # Async wrapper for code splitting
│
│   Sub-components and their extracted logic:
├── SubComponent.vue           # Sub-component (thin template)
├── SubComponent.strings.ts    # Its own strings file
├── SubComponent.logic.ts      # Pure business logic (validation, transforms)
├── SubComponent.logic.test.ts # Unit tests for pure logic
├── useSubComponentFlow.ts     # Composable (stateful + networking logic)
└── useSubComponentFlow.test.ts # Integration tests for composable
```

Not every sub-component needs all of these files — only create logic files and composables when there is logic worth extracting and testing. Simple presentational components may only need a `.vue` and `.strings.ts`.

Other types of views follow the same pattern.

## Files Explained

There are very good reasons to break down every view into several files! Each file has a role, and so it's easy to find the code that has the responsibility you're looking for.

### Async Component: Code Splitting, Loading/Error States

_[Template file](../workflows/template/__subdomain-name__/__group-name__/__TargetName__Async.vue)_

By default, SAF SPAs will split out every page. This is controlled by the `Async` vue component, which will normally look like this:

```vue
<template>
  <AsyncPage :loader="() => usePageLoader()" :page-component="Page" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { usePageLoader } from "./PageName.loader.ts";
import { AsyncPage } from "@saflib/vue/components";

const Page = defineAsyncComponent(() => import("./PageName.vue"));
</script>
```

The Vue router, and by extension the Vue app, do not directly import or render the page component. This is where the majority of the app's business logic will go, and so by default only necessary code is loaded by the application at first. The async component decides what will render while the code is loading and the data is being fetched; `AsyncPage` only renders the page component when both are present. `AsyncPage` also handles generic error states when either fail to arrive.

If it's important to have certain common landing pages loaded sooner, the tradeoff can be decided to import the page component directly.

It's important that _no other components in the app_ render async components. By centralizing that responsibility on async components, it makes it easier to understand and manage how the app is chunked. If a page becomes large (such as a dashboard with many widgets), the page's async component can render all async components with their own loader methods. This way code and responsibilities can still be broken down, while also loading all code and fetching all data as quickly as possible.

The only exception to this is if the component is not rendered on page load. For example if there's a heavy dialog, the page might render the async component only when the dialog is opened, or after the page is initially loaded to preload the code.

### Loader: Data Fetching

_[Template file](../workflows/template/__subdomain-name__/__group-name__/__TargetName__.loader.ts)_

Both the async component and the page component use the loader; the async component uses it to start fetching data and know when it's done, while the page component uses it to get the data to render. Since both depend on it, the loader exists in a separate file.

Because the loader always uses Tanstack queries to fetch data, and the Tanstack client is configured to allow stale data for a few seconds, the page calling the loader will usually use the same data without causing extra requests.

### Component: Rendering

_[Template file](../workflows/template/__subdomain-name__/__group-name__/__TargetName__.vue)_

Because the async component ensures the page component doesn't render until the data is fetched, the page component can assume the data is available and render it. It doesn't need to worry about checking for errors or handling loading states, and can instead focus on the happy path.

### Strings: Localization and Testability

_[Template file](../workflows/template/__subdomain-name__/__group-name__/__TargetName__.strings.ts)_

Strings are important to keep separate from the Vue component because they:

- need to be localized, and
- are invaluable for testing

By keeping them in separate files, they can be exported and used by processes which don't need to know about, parse, or compile Vue components, in particular: [Playwright](../../playwright/docs/overview.md).

**Each sub-component should have its own strings file** (e.g. `MyDialog.strings.ts`). Don't pile all strings into the view's strings file — it becomes hard to manage and makes it unclear which strings belong to which component.

For localization, see [i18n](./03-i18n.md).

### Logic Files: Pure Business Logic

Logic files (`ComponentName.logic.ts`) contain **pure TypeScript functions** extracted from Vue components. This includes:

- Validation logic (e.g. "can this form be submitted?")
- Data transformation (e.g. building API payloads, mapping response data to UI state)
- Formatting (e.g. dates, scores, percentages)
- Type coercion and defaulting

These functions take plain values and return plain values — no Vue reactivity, no DOM, no network calls. This makes them trivial to unit test:

```typescript
// EvalCreateDialog.logic.ts
export function canCreate(name: string, prompt: string, formId: string | null, selectedGroupHeaders: string[]): boolean {
  if (!name.trim() || !prompt.trim()) return false;
  if (!formId) return false;
  return selectedGroupHeaders.length > 0;
}

// EvalCreateDialog.logic.test.ts
it("returns false when name is empty", () => {
  expect(canCreate("", "prompt", "form-1", ["group"])).toBe(false);
});
```

The component then imports and calls these functions, keeping its `<script setup>` focused on wiring reactivity to the template.

### Composables: Stateful and Networking Logic

When a component has **stateful logic involving networking** — TanStack mutations, multi-step flows, state machines, or complex error handling — extract it into a composable (`useComponentFlow.ts`).

The composable owns:

- Reactive state (refs, computed properties)
- TanStack queries and mutations
- Orchestration logic (e.g. create → upload → run → set expected)
- Error handling and step transitions

It exposes reactive state and action methods to the component, which can then be a thin template:

```typescript
// useEvalCreateFlow.ts
export function useEvalCreateFlow(callbacks: {
  onClose: () => void;
  onCreated: (evalId: string) => void;
}) {
  const createStep = ref<CreateStep>("setup");
  const createName = ref("");
  // ... state, queries, mutations, orchestration ...
  return { createStep, createName, handleCreate, handleSaveExpected, ... };
}
```

Composables are tested using `withVueQuery` and `setupMockServer` with the SDK's fake handlers — full integration tests that exercise the state machine and networking without a DOM:

```typescript
// useEvalCreateFlow.test.ts
setupMockServer(iformServiceFakeHandlers);

it("create without file: creates eval, calls onClose", async () => {
  const [flow, app] = withVueQuery(() => useEvalCreateFlow({ onClose, onCreated }));
  flow.createName.value = "Test Eval";
  // ... set up state ...
  flow.handleCreate();
  await vi.waitFor(() => expect(createdId).not.toBeNull());
  expect(closeCalled).toBe(true);
  app.unmount();
});
```

### Test: Integration Testing

_[Template file](../workflows/template/__subdomain-name__/__group-name__/__TargetName__.test.ts)_

Since Vue components depend on a great number of things, it's most useful to have integration (or component) tests for them. These tests run the page within a complete Vue app, with browser interfaces and network requests stubbed.

See [testing](./04-testing.md) for more info.


### Fixture: the Playwright Kind

_[Template file](../workflows/template/__subdomain-name__/__group-name__/__TargetName__.fixture.ts)_

A [Playwright Fixture](https://playwright.dev/docs/test-fixtures) provides a consistent, reusable way for Playwright tests to interact with the application. Since the fixture is tightly coupled to the implementation and feature set of a view, it lives in the same directory as the view.

## Sub-Components

Naturally, pages will often be complex enough to warrant breaking down into sub-components. Where these components live depends:

- If they're specific to the page, they should live in the page's directory alongside it.
- If they're shared across multiple pages, they should go in `common` package which is adjacent to all the SPA packages.

### Keep Interfaces Simple

Sub-components should **not** have overly complicated prop/emit interfaces. The key principle: only pass data through props that was loaded by the view's loader. For everything else, let sub-components access TanStack queries and mutations directly.

For example, if a dialog needs to create an eval, upload a file, and run a mutation chain, the dialog (or its composable) should call those mutations itself — the parent shouldn't thread mutation callbacks through props and coordinate the flow from outside.

This keeps parent-child interfaces focused on **what data to render**, not **how to orchestrate network operations**.

### Forms

If a page renders any form elements, such as an `input` or `select`, they should _always_ live as a separate component from the page. Their name should end in `Form` and use [`defineModel`](https://vuejs.org/api/sfc-script-setup.html#definemodel). Where possible, Form components should model schemas defined in packages using [`@saflib/openapi`](../../openapi/docs/01-overview.md), for a portable way to edit common business models.

Form Vue components, like HTML form elements, are not responsible for updating data on the backend. Form components may call other APIs if they're needed by components (like autocompletes), but it's up to the page component to have some sort of submit button to take the modeled data and fire off a Tanstack mutation, as well network responses.

Form components _are_ responsible for exposing whether the entered data is valid. They should use `defineExpose` to expose an `isValid` property which the page component can use to enable or disable the submit button.

### Displays

A display component is simply a component which is not a form; it displays data. These tend to be classic "presentational" components, though similar to form components, they _may_ fetch data or otherwise perform networking (such as components which load more data on demand).

Displays, like forms and pages, should declare their role by having `Display` at the end of their name, or the name of their top-level design-system or HTML component (card, table, etc.).

## Best Practices

### Avoid Custom CSS

All components should avoid custom CSS if they can. Instead, take advantage of Vuetify's [utility classes](https://vuetifyjs.com/en/styles/borders/#usage) and [grid system](https://vuetifyjs.com/en/components/grids/#usage), and defer to app-specific [theming](https://vuetifyjs.com/en/features/theme/#api), and [SASS variables](https://vuetifyjs.com/en/features/sass-variables/#installation).

If a component still needs custom CSS, it should be done in a `style` block at the bottom of the component, and `scoped` to avoid affecting other components.

### Run All Strings Through Vue I18n

Even if you don't plan on translating your application ever, it's useful for testing to structure your strings in a consistent way, especially if they involve interpolating values or HTML elements.

See more in [i18n](./03-i18n.md).
