# Overview

[Playwright](https://playwright.dev/) is a key part in making sure everything in the product works together, and this library provides some useful utilities for making the most of it.

## String Locators

Despite Playwright's [wide array of locators](https://playwright.dev/docs/locators) and [helpful tools](https://playwright.dev/docs/codegen), I find I spend too much time setting up and fixing string locators as the UI changes. The main difficulty is how exact and precise they need to be, and minor changes in copy can spawn a great many fixes.

This is where [sharing strings](../../best-practices.md#specify-and-enforce-shared-apis-models-and-strings) really comes in handy. By structuring client strings in a consistent way and making them available outside of client packages _without_ depending on client build systems (rollup, vite, etc.), Playwright can use the same exact strings the client does and enforce that through type checking. There's no more duplicating the same strings across Playwright tests and client code.

It's also important that these strings be organized to match HTML attributes. Strings are stored in objects that follow [this type](../../utils/docs/ref/interfaces/ElementStringObject.md); an object with keys such as `"aria-label"`, `"text"`, `"role"`, etc.

Then, Vue can bind the entire object to the element like this:

```html
<button v-bind="elementStringObject" />
```

And Playwright, given the same object, can [use the best locator for the job](https://github.com/sderickson/saflib/blob/3d6b57ea4a4e4abcdca96826413585c3a0844c1d/playwright/index.ts#L26-L48), given what's available.

See `@saflib/vue` for more information on how to define and export strings.

## User Journeys

Playwright tests should live in the client package which they mainly test, and they should test the important user journeys the client implements. These user journeys should come from the designs provided, so that Playwright tests enforce that designed user journeys continue to work as expected.

Playwright tests can also provide a record of these user journeys, for review and feedback. Playwright tests should use the provided [`attachScreenshot`](./ref/functions/attachScreenshot.md) function to create a visual record of the user journey for easier review. These can be shipped to where others in the organization can see them, for understanding a given client package, or for QA.
