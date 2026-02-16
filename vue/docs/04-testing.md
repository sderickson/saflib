# Testing

Component testing in SAF applications should use:

- [Vue Test Utils](https://test-utils.vuejs.org/guide/) for basic tooling
- [Vitest](https://vitest.dev/) with [JSDOM](https://github.com/jsdom/jsdom) for running tests
- [MSW](https://mswjs.io/) for network mocking

`@saflib/vue` has these as dependencies, and provides helper methods for gluing everything together.

## Shared Test App

Each SPA should have a `test-app.ts` at the root of the root of the package. See [`test-app.ts`](./01-overview.md#test-app-ts) for information on setting that up. This handles all the plugins that Vue components expect in order to function properly. Most of this will be taken care of by `@saflib/vue`'s [`mountWithPlugins`](./ref/@saflib/vue/testing/functions/mountWithPlugins.md) function, but if your SPA has other needs such as additional plugins, `test-app.ts` is the place to do that.

## Globals

Within your test's `describe` block, you should call [`stubGlobals()`](./ref/@saflib/vue/testing/functions/stubGlobals.md) to set up the globals that Vue components expect, such as ResizeObserver which is a common requirement for Vuetify components.

## Network Mocking

In order to test the integration of everything involved in rendering a page, you should

1. Mount the async component to test, not the page component
2. `vi.waitFor` a string from the page component to render
3. Mock all API calls that the component makes in the loader method

Rather than including mock data in the same file, which will often be redundant with other files, tests should import mock data from the package that provides the Tanstack queries, per [best practices](../../best-practices.md#ownership-of-mocks-fakes-shims).

Use [`setupMockServer`](../../sdk/docs/ref/@saflib/sdk/testing/functions/setupMockServer.md) within the `describe` block next to `setupGlobals`. They both handle setup and teardown for each test.

## Element Selection

This is where having strings stored separately really pays off. Instead of hard-coding strings in tests that also exist in the Vue component they test, tests should import the adjacent string objects and use [`getElementByString`](./ref/@saflib/vue/testing/functions/getElementByString.md) to find the elements by text or attributes. This function takes either a string or an object of string values and uses the best selection method, and also converts i18n strings into regular regexes.

## Testing Strategy

The testing approach for Vue views prioritizes testing **logic**, not **rendering**. The layers are:

| What to test | How to test | File pattern |
|---|---|---|
| Pure business logic (validation, transforms, formatting) | Plain vitest unit tests | `ComponentName.logic.test.ts` |
| Stateful logic with networking (mutations, flows, state machines) | `withVueQuery` + `setupMockServer` | `useComponentFlow.test.ts` |
| Data layer (queries, mutations, cache invalidation) | SDK tests with MSW fakes | (in the SDK package) |
| Full user flows | Playwright E2E tests | (in the test suite) |
| Initial render smoke test | Mount async component, `vi.waitFor` | `PageName.test.ts` |

### Logic File Tests

Logic files contain pure functions, so their tests are straightforward — import the function, call it, assert the result. No Vue setup, no DOM, no network:

```typescript
import { canCreate, buildExpectedResponse } from "./MyDialog.logic.ts";

it("returns false when name is empty", () => {
  expect(canCreate("", "prompt", "form-1", ["group"])).toBe(false);
});

it("preserves falsy non-null values", () => {
  expect(buildExpectedResponse({ flag: false, count: 0 })).toEqual({ flag: false, count: 0 });
});
```

These tests are fast (typically < 5ms for dozens of tests) and stable since they have no external dependencies.

### Composable Tests

Composables that involve TanStack queries/mutations need a Vue app context and a mock server. Use the same pattern as SDK tests:

```typescript
import { iformServiceFakeHandlers, mockEvals, mockForms } from "@vendata/iform-sdk/fakes";
import { withVueQuery } from "@saflib/sdk/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";

describe("useMyFlow", () => {
  setupMockServer(iformServiceFakeHandlers);

  beforeEach(() => {
    mockEvals.length = 0;
    // set up test data...
  });

  it("creates and transitions to next step", async () => {
    const [flow, app] = withVueQuery(() => useMyFlow({ onClose, onCreated }));
    flow.name.value = "Test";
    flow.handleCreate();
    await vi.waitFor(() => expect(createdId).not.toBeNull());
    app.unmount();
  });
});
```

Key points:

- Use `withVueQuery` to run the composable inside a minimal Vue app with a QueryClient
- Use `setupMockServer` with the SDK's fake handlers for realistic network behavior
- Import and modify mock data arrays (e.g. `mockEvals`) to set up and verify backend state
- Use `vi.waitFor` to wait for async state transitions (mutations use callbacks, not await)
- Always call `app.unmount()` at the end of each test

### Render Tests

The template includes a basic render test (`PageName.test.ts`) that mounts the async component and verifies the page loads. This serves as a smoke test that the page's loader, data assertions, and initial render work together.

Render tests should **not** attempt to test interactions (clicking buttons, filling forms, submitting). That logic should be extracted into composables and tested there, or covered by Playwright E2E tests. Render tests that simulate interactions are fragile, slow, and duplicate coverage.

## Coverage

### Excluded Files

The shared vitest config excludes files from coverage that don't contain meaningful logic:

- `*.strings.ts` — pure localization data
- `*.loader.ts` — simple prefetch wrappers
- `test-app.ts`, `fixtures.ts` — test infrastructure
- `main.ts`, `router.ts` — app bootstrapping (covered by E2E)

This keeps the report focused on files with actual logic.

### Making the Report Useful

Each page should have a render test (`PageName.test.ts`) that mounts the async component and verifies it loads. This drives baseline coverage on the Vue file — the "easy" coverage.

Lines that remain uncovered after the render test indicate logic worth extracting:

- Pure logic → `.logic.ts` (covered by fast unit tests)
- Stateful/networking logic → `useFlow.ts` composable (covered by integration tests)

After extraction, the Vue file is thin, the logic files have high coverage from focused tests, and the remaining uncovered lines in Vue files are simple event handler wiring that Playwright covers.

### Coverage Enforcement

To enforce coverage thresholds, use `defaultConfigWithCoverageEnforcement` in your `vitest.config.ts`:

```typescript
import { defaultConfigWithCoverageEnforcement } from "@saflib/vue/vitest-config";

export default defaultConfigWithCoverageEnforcement;
```

This enables automatic coverage collection on every `npm run test` and enforces:

| Pattern | Lines | Branches | Functions | Statements |
|---|---|---|---|---|
| `**/*.logic.ts` | 90% | 90% | 90% | 90% |
| Global (all files) | 50% | 50% | 30% | 50% |

The global functions threshold is lower because Vue template event handlers (e.g. `@click`) count as uncovered functions in render-only tests.

If coverage falls below these thresholds, `npm run test` fails — including when run by the `vue/add-view` workflow, forcing the agent to write adequate tests before the step passes.
