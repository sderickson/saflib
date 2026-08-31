# Testing

Component testing in SAF applications should use:

- [Vue Test Utils](https://test-utils.vuejs.org/guide/) for basic tooling
- [Vitest](https://vitest.dev/) with [JSDOM](https://github.com/jsdom/jsdom) for running tests
- [MSW](https://mswjs.io/) for network mocking

`@saflib/vue` has these as dependencies, and provides helper methods for gluing everything together.

## Shared Test App

Each SPA should have a `test-app.ts` at the root of the package. See [`test-app.ts`](./01-overview.md#test-app-ts) for information on setting that up. This handles Vue plugins (router, i18n) via `@saflib/vue`'s [`mountWithPlugins`](./ref/@saflib/vue/testing/functions/mountWithPlugins.md). Do **not** put a kitchen-sink MSW `testAppHandlers` bag here — each test imports only the SDK resource-group fake handlers it needs (same idea as Express slim route tests).

## Globals

Within your test's `describe` block, you should call [`stubGlobals()`](./ref/@saflib/vue/testing/functions/stubGlobals.md) to set up the globals that Vue components expect, such as ResizeObserver which is a common requirement for Vuetify components.

## Network Mocking

In order to test the integration of everything involved in rendering a page, you should

1. Mount the async component to test, not the page component
2. `vi.waitFor` a string from the page component to render
3. Mock all API calls that the component makes in the loader method

Rather than including mock data in the same file, which will often be redundant with other files, tests should import mock data from the package that provides the Tanstack queries, per [best practices](../../best-practices.md#ownership-of-mocks-fakes-shims).

Use [`setupMockServer`](../../sdk/docs/ref/@saflib/sdk/testing/functions/setupMockServer.md) within the `describe` block next to `stubGlobals`. Import only the resource-group fake handler modules the page/composable actually calls (via the SDK package glob, e.g. `@scope/sdk/requests/matters/index.fakes`) — not a full-service mega bag from `./fakes`.

```typescript
import { adminFakeHandlers } from "@saflib/base-sdk/requests/admin/index.fakes";
import { userConfigsFakeHandlers } from "@saflib/base-sdk/requests/user-configs/index.fakes";
import { setupMockServer } from "@saflib/sdk/testing/mock";

describe("MyPage", () => {
  stubGlobals();
  setupMockServer([...adminFakeHandlers, ...userConfigsFakeHandlers]);
  // ...
});
```

If a view uses only static fixtures and makes no network calls, omit `setupMockServer`.

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
| Component behavior (clicks, emits, navigation) | Mount async component + interactions | `PageName.test.ts` (only when behavior is worth unit-testing) |

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

When logic tests need OpenAPI/service model objects, import factories from product `*-test` packages (`@scope/<product>-test/factories/*` for core models; `@scope/<product>-<offshoot>-test/factories/*` and `provenance/*` for offshoot models). Do not hand-build large empty objects when a factory exists; add factories there when the same shape is reused. Prod empties stay on `*-spec`; SPA `test-app.ts` / package `testing/` stay for mount helpers only.

### Composable Tests

Composables that involve TanStack queries/mutations need a Vue app context and a mock server. Use the same pattern as SDK tests:

```typescript
import { adminFakeHandlers } from "@saflib/base-sdk/requests/admin/index.fakes";
import { withVueQuery } from "@saflib/sdk/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";

describe("useMyFlow", () => {
  setupMockServer(adminFakeHandlers);

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

### Component Tests

Do **not** add render-only smoke tests that only mount a page and assert visible copy. Those are slow, fragile, and duplicate Playwright.

Add `PageName.test.ts` only when it exercises **behavior** — opening dialogs, route redirects, hash-driven updates, button clicks with assertions on side effects. Mount the async component (or a `<RouterView />` wrapper for nested routes), mock API calls from the loader, and use `vi.waitFor` for async UI.

Interaction-heavy flows belong in composable tests (`useComponentFlow.test.ts`) or Playwright, not in broad page mount tests.

### Nested routes

Pages that use [nested routes with AsyncPage](./05-nested-routes.md) must be tested by mounting a root `<RouterView />` wrapper, not the parent async component directly. Push the router to an explicit child path (for example `/resource/:id/section`) before mounting so the parent layout and child route both render at the correct depth.

Use `router.push()` to navigate between child sections in tests rather than clicking sidebar items when you are verifying route-driven content changes.

## Coverage

### Excluded Files

The shared vitest config excludes files from coverage that don't contain meaningful logic:

- `*.strings.ts` — pure localization data
- `*.loader.ts` — simple prefetch wrappers
- `test-app.ts`, `*.fixture.ts` — test infrastructure
- `main.ts`, `router.ts` — app bootstrapping (covered by E2E)

This keeps the report focused on files with actual logic.

### Making the Report Useful

Coverage focuses on **`.logic.ts`** and **`use*.ts`** composables (enforced when using `defaultConfigWithCoverageEnforcement`). Vue SFCs are excluded from coverage — they should stay thin; Playwright covers page wiring and navigation.

When logic lives inline in a Vue file, extract it:

- Pure logic → `.logic.ts` (covered by fast unit tests)
- Stateful/networking logic → `useFlow.ts` composable (covered by integration tests)

### Coverage Enforcement

To enforce coverage thresholds, use `defaultConfigWithCoverageEnforcement` in your `vitest.config.ts`:

```typescript
import { defaultConfigWithCoverageEnforcement } from "@saflib/vue/vitest-config";

export default defaultConfigWithCoverageEnforcement;
```

This enables automatic coverage collection on every `npm run test` and enforces per-file thresholds on logic and composables:

| Pattern | Lines | Branches | Functions | Statements |
|---|---|---|---|---|
| `**/*.logic.ts` | 90% | 90% | 90% | 90% |
| `**/use*.ts` (composables) | 80% | 70% | — | 80% |

Vue SFCs are excluded from coverage (see **Excluded Files** above). Branch and function thresholds are omitted for composables where async paths are only exercised in Playwright.

If coverage falls below these thresholds, `npm run test` fails — including when run by the `vue/add-view` workflow, forcing the agent to write adequate tests before the step passes.
