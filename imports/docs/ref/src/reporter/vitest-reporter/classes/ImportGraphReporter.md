[**@saflib/imports**](../../../../index.md)

---

# Class: ImportGraphReporter

Vitest reporter that prints static import-graph stats after each test file.

Opt-in via package vitest config — not enabled in `@saflib/vitest` defaults
until suite overhead is confirmed ≤ 10%.

Prefer registering by package name so Vitest loads the module via Vite
(plain `vitest.config.js` cannot import `.ts` package exports under Node):

```js
reporters: ["default", "@saflib/imports/reporter"];
```

## Implements

- `Reporter`

## Constructors

### Constructor

> **new ImportGraphReporter**(): `ImportGraphReporter`

#### Returns

`ImportGraphReporter`

## Methods

### onTestModuleEnd()

> **onTestModuleEnd**(`testModule`): `void`

Called when all tests of the test file have finished running.

#### Parameters

| Parameter    | Type         |
| ------------ | ------------ |
| `testModule` | `TestModule` |

#### Returns

`void`

#### Implementation of

`Reporter.onTestModuleEnd`
