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

Use [`setupMockServer`](./ref/@saflib/vue/testing/functions/setupMockServer.md) within the `describe` block next to `setupGlobals`. They both handle setup and teardown for each test.

## Element Selection

This is where having strings stored separately really pays off. Instead of hard-coding strings in tests that also exist in the Vue component they test, tests should import the adjacent string objects and use [`getElementByString`](./ref/@saflib/vue/testing/functions/getElementByString.md) to find the elements by text or attributes. This function takes either a string or an object of string values and uses the best selection method, and also converts i18n strings into regular regexes.

## Testing Interactions

While not prohibited, testing interactions through Vue component testing is not recommended. This ups the complexity of the stubs required (needing to handle not only GET methods) and provides marginal value. Better to test important interactions as part of larger user flows in Playwright tests.

If there is interaction code which really ought to be tested at a more focused level, this logic should be pulled out of the component and tested in a unit test. If there are complex network behaviors, use [`withVueQuery`](./ref/@saflib/vue/testing/functions/withVueQuery.md). If they don't use the network, consider pulling them out and testing them as [composables](https://test-utils.vuejs.org/guide/advanced/reusability-composition.html#Testing-composables).
